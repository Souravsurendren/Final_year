from __future__ import annotations

import re
from typing import Dict, List, Any


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9\.]+", text.lower()))


def _lexical_overlap_score(a: str, b: str) -> float:
    ta = _tokenize(a)
    tb = _tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def _split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def build_evidence_payload(retrieved_chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    evidence = []
    for c in retrieved_chunks[:top_k]:
        evidence.append(
            {
                "chunk_id": c.get("chunk_id"),
                "source": c.get("source") or c.get("source_document") or "unknown",
                "page": c.get("page") or c.get("page_index"),
                "text": c.get("text", ""),
                "scores": {
                    "semantic": c.get("semantic_score"),
                    "lexical": c.get("lexical_score"),
                    "hybrid": c.get("hybrid_score"),
                    "rerank": c.get("rerank_score"),
                },
            }
        )
    return evidence


def attribute_answer_to_evidence(answer: str, evidence_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sentences = _split_sentences(answer)
    attributions: List[Dict[str, Any]] = []

    for sent in sentences:
        best = None
        best_score = -1.0
        for chunk in evidence_chunks:
            score = _lexical_overlap_score(sent, chunk.get("text", ""))
            if score > best_score:
                best = chunk
                best_score = score

        if best is None:
            continue

        attributions.append(
            {
                "text_span": sent,
                "chunk_id": best.get("chunk_id"),
                "source": best.get("source") or best.get("source_document") or "unknown",
                "page": best.get("page") or best.get("page_index"),
                "support_score": round(float(max(best_score, 0.0)), 3),
            }
        )

    return attributions
