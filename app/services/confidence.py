from __future__ import annotations

import itertools
import re
from difflib import SequenceMatcher
from typing import Any, Callable, Dict, List


def _normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def _pairwise_similarity(samples: List[str]) -> float:
    if len(samples) <= 1:
        return 1.0

    ratios = []
    for a, b in itertools.combinations(samples, 2):
        ra = _normalize_text(a)
        rb = _normalize_text(b)
        ratios.append(SequenceMatcher(None, ra, rb).ratio())

    if not ratios:
        return 1.0
    return float(sum(ratios) / len(ratios))


def compute_confidence(
    answer: str,
    sample_generator: Callable[[int], List[str]] | None = None,
    n_samples: int = 3,
) -> Dict[str, Any]:
    samples = [answer]
    if sample_generator is not None and n_samples > 1:
        try:
            generated = sample_generator(n_samples - 1)
            samples.extend([s for s in generated if isinstance(s, str) and s.strip()])
        except Exception:
            # Fallback to deterministic single-answer confidence.
            pass

    similarity = _pairwise_similarity(samples)
    confidence = max(0.05, min(0.99, similarity))

    warning = None
    if confidence < 0.65:
        warning = "Low confidence, verify with doctor"

    return {
        "confidence": round(float(confidence), 3),
        "warning": warning,
        "n_samples": len(samples),
        "sample_similarity": round(float(similarity), 3),
    }
