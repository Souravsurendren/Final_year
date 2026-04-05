from __future__ import annotations

import re
from typing import Any, Dict, List

from .retrieval_service import adaptive_hybrid_search


_MEDICAL_ENTITY_PATTERN = re.compile(
    r"\b(?:diabetes|hypertension|cancer|asthma|insulin|metformin|aspirin|bp|hba1c|creatinine|cholesterol|mg|mmhg|ml|bpm)\b",
    re.IGNORECASE,
)


def _split_claims(text: str) -> List[str]:
    claims = re.split(r"(?<=[.!?])\s+", text.strip())
    return [c.strip() for c in claims if c.strip()]


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9\.]+", text.lower()))


def _support_score(claim: str, evidence_text: str) -> float:
    claim_tokens = _tokenize(claim)
    ev_tokens = _tokenize(evidence_text)
    if not claim_tokens or not ev_tokens:
        return 0.0
    overlap = len(claim_tokens & ev_tokens)
    return overlap / max(len(claim_tokens), 1)


def _extract_medical_entities(text: str) -> List[str]:
    return sorted(set(m.group(0).lower() for m in _MEDICAL_ENTITY_PATTERN.finditer(text)))


def verify_output(answer: str, evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
    claims = _split_claims(answer)
    issues: List[Dict[str, Any]] = []
    supported_claims = 0

    for claim in claims:
        best_score = 0.0
        best_chunk = None
        for ev in evidence:
            score = _support_score(claim, ev.get("text", ""))
            if score > best_score:
                best_score = score
                best_chunk = ev

        if best_score >= 0.35:
            supported_claims += 1
            continue

        # Retrieval-based fallback check for low-support claims.
        fallback_support = 0.0
        try:
            fallback = adaptive_hybrid_search(claim)
            fallback_results = fallback.get("results", [])
            if fallback_results:
                fallback_support = _support_score(claim, fallback_results[0].get("text", ""))
        except Exception:
            fallback_support = 0.0

        if fallback_support >= 0.4:
            supported_claims += 1
            continue

        entities = _extract_medical_entities(claim)
        issue_type = "unsupported_claim"
        if entities:
            issue_type = "unverified_medical_claim"

        issues.append(
            {
                "type": issue_type,
                "claim": claim,
                "entities": entities,
                "best_support_score": round(float(max(best_score, fallback_support)), 3),
                "evidence_chunk_id": best_chunk.get("chunk_id") if best_chunk else None,
            }
        )

    total_claims = max(len(claims), 1)
    confidence = supported_claims / total_claims

    return {
        "verified": len(issues) == 0,
        "confidence": round(float(confidence), 3),
        "issues": issues,
    }
