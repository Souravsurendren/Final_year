from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..medical_vision import analyze_medical_image
from ..summarizer import call_nvidia_llm, map_reduce_summarize
from ..utils import log_event
from .confidence import compute_confidence
from .explainability import attribute_answer_to_evidence, build_evidence_payload
from .fact_checker import verify_output
from .retrieval_service import adaptive_hybrid_search


_QA_SYSTEM_PROMPT = """You are a medical RAG assistant.
Answer ONLY from retrieved evidence. If evidence is insufficient, explicitly say so.
Use clear medical language and avoid unsupported assumptions.
"""


def _generate_variants(system_prompt: str, user_prompt: str, count: int) -> List[str]:
    variants = []
    temperatures = [0.25, 0.5, 0.75, 0.35, 0.65]
    for i in range(count):
        temp = temperatures[i % len(temperatures)]
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        variants.append(call_nvidia_llm(messages, temperature=temp))
    return variants


def _build_final_payload(
    answer: str,
    retrieved_chunks: List[Dict[str, Any]],
    query: str,
    modality: str = "text",
    image_findings: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    evidence = build_evidence_payload(retrieved_chunks, top_k=min(8, len(retrieved_chunks)))
    attributions = attribute_answer_to_evidence(answer, evidence)

    def _sample_gen(extra_count: int) -> List[str]:
        evidence_context = "\n\n".join([e.get("text", "") for e in evidence[:4]])
        user_prompt = f"Question: {query}\n\nEvidence:\n{evidence_context}\n\nProvide a clinically careful answer."
        return _generate_variants(_QA_SYSTEM_PROMPT, user_prompt, extra_count)

    conf_obj = compute_confidence(answer=answer, sample_generator=_sample_gen, n_samples=3)
    fact_check = verify_output(answer, evidence)

    payload: Dict[str, Any] = {
        "answer": answer,
        "evidence": evidence,
        "attribution": attributions,
        "confidence": conf_obj["confidence"],
        "warning": conf_obj.get("warning"),
        "fact_check": fact_check,
        "modality": modality,
    }

    if image_findings is not None:
        payload["image_findings"] = image_findings

    log_event(
        "rag_response",
        {
            "query": query,
            "modality": modality,
            "confidence": payload["confidence"],
            "fact_verified": fact_check.get("verified"),
            "evidence_count": len(evidence),
        },
    )
    return payload


def summarize_with_explainable_rag(query: str = "Summarize full report comprehensively") -> Dict[str, Any]:
    retrieval = adaptive_hybrid_search(query)
    retrieved_chunks = retrieval.get("results", [])

    summary = map_reduce_summarize(retrieved_chunks)
    payload = _build_final_payload(answer=summary, retrieved_chunks=retrieved_chunks, query=query)
    payload["retrieval"] = {
        "lambda_semantic": retrieval.get("lambda_semantic"),
        "cached": retrieval.get("cached", False),
        "query_type": "adaptive",
    }
    return payload


def ask_with_explainable_rag(question: str) -> Dict[str, Any]:
    retrieval = adaptive_hybrid_search(question)
    retrieved_chunks = retrieval.get("results", [])

    evidence_context = "\n\n".join(
        [
            f"[chunk_id={c.get('chunk_id')}|source={c.get('source')}|page={c.get('page')}] {c.get('text', '')}"
            for c in retrieved_chunks[:6]
        ]
    )

    messages = [
        {"role": "system", "content": _QA_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Question: {question}\n\nRetrieved Evidence:\n{evidence_context}\n\nReturn a clinically-safe answer.",
        },
    ]
    answer = call_nvidia_llm(messages, temperature=0.35)

    payload = _build_final_payload(answer=answer, retrieved_chunks=retrieved_chunks, query=question)
    payload["retrieval"] = {
        "lambda_semantic": retrieval.get("lambda_semantic"),
        "cached": retrieval.get("cached", False),
        "query_type": "adaptive",
    }
    return payload


def ask_multimodal(question: str, image_path: Optional[str] = None) -> Dict[str, Any]:
    text_payload = ask_with_explainable_rag(question)
    if image_path:
        image_result = analyze_medical_image(image_path)
        image_findings = {
            "image_type": image_result.get("image_type"),
            "abnormalities_detected": image_result.get("abnormalities_detected"),
            "impression": image_result.get("impression"),
            "recommendations": image_result.get("recommendations", []),
            "confidence_score": image_result.get("confidence_score"),
        }

        unified_answer = (
            f"Document-grounded response:\n{text_payload['answer']}\n\n"
            f"Image findings ({image_findings['image_type']}): {image_findings['impression']}"
        )
        return _build_final_payload(
            answer=unified_answer,
            retrieved_chunks=text_payload.get("evidence", []),
            query=question,
            modality="text+image",
            image_findings=image_findings,
        )

    return text_payload
