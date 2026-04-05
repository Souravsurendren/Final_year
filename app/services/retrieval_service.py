from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any

import numpy as np

from ..bm25_search import load_bm25
from ..config import META_DIR, RE_RANK_K, TOP_K_BM25, TOP_K_DENSE
from ..indexer import load_faiss
from ..reranker import rerank
from ..utils import log_event
from ..retrieval import load_chunk_metadata


# Lightweight in-memory caches to avoid repeated disk/model loads.
_ENGINE_CACHE: Dict[str, Any] = {}
_QUERY_CACHE: Dict[str, List[Dict[str, Any]]] = {}


_MEDICAL_KEYWORDS = {
    "dose",
    "dosage",
    "mg",
    "mmhg",
    "hb",
    "hba1c",
    "creatinine",
    "platelet",
    "insulin",
    "metformin",
    "aspirin",
    "hypertension",
    "diabetes",
    "diagnosis",
    "bp",
    "ecg",
    "mri",
    "ct",
    "xray",
    "ldl",
    "hdl",
    "cholesterol",
    "bilirubin",
}


def _normalize_scores(score_map: Dict[str, float]) -> Dict[str, float]:
    if not score_map:
        return {}
    values = np.array(list(score_map.values()), dtype=np.float32)
    lo = float(values.min())
    hi = float(values.max())
    if hi - lo < 1e-8:
        return {k: 1.0 for k in score_map}
    return {k: (v - lo) / (hi - lo) for k, v in score_map.items()}


def classify_query_type(query: str) -> str:
    q = query.lower()
    tokens = set(re.findall(r"[a-zA-Z0-9\.]+", q))
    if any(t in _MEDICAL_KEYWORDS for t in tokens):
        return "medical_keyword_heavy"
    if len(tokens) > 12 or "?" in q or any(w in q for w in ["why", "how", "explain", "summarize"]):
        return "natural_language"
    return "mixed"


def dynamic_lambda(query: str) -> float:
    query_type = classify_query_type(query)
    if query_type == "medical_keyword_heavy":
        # More lexical trust for exact medical terminology.
        return 0.35
    if query_type == "natural_language":
        return 0.75
    return 0.55


def _cache_key(query: str, top_k_dense: int, top_k_bm25: int, re_rank_k: int, meta_dir: str) -> str:
    raw = f"{query}|{top_k_dense}|{top_k_bm25}|{re_rank_k}|{meta_dir}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def get_retrieval_engine(meta_dir: str | Path = META_DIR) -> Dict[str, Any]:
    key = str(meta_dir)
    if key in _ENGINE_CACHE:
        return _ENGINE_CACHE[key]

    index, emb_model, id_map = load_faiss()
    bm25, bm25_ids = load_bm25()
    chunks = load_chunk_metadata(meta_dir)

    id_to_chunk: Dict[str, Dict[str, Any]] = {}
    for c in chunks:
        c_id = str(c.get("chunk_id"))
        id_to_chunk[c_id] = c

    engine = {
        "index": index,
        "emb_model": emb_model,
        "id_map": id_map,
        "bm25": bm25,
        "bm25_ids": bm25_ids,
        "id_to_chunk": id_to_chunk,
    }
    _ENGINE_CACHE[key] = engine
    return engine


def adaptive_hybrid_search(
    query: str,
    meta_dir: str | Path = META_DIR,
    top_k_dense: int = TOP_K_DENSE,
    top_k_bm25: int = TOP_K_BM25,
    re_rank_k: int = RE_RANK_K,
) -> Dict[str, Any]:
    cache_key = _cache_key(query, top_k_dense, top_k_bm25, re_rank_k, str(meta_dir))
    if cache_key in _QUERY_CACHE:
        cached = _QUERY_CACHE[cache_key]
        return {
            "query": query,
            "lambda_semantic": dynamic_lambda(query),
            "results": cached,
            "cached": True,
        }

    engine = get_retrieval_engine(meta_dir)
    index = engine["index"]
    emb_model = engine["emb_model"]
    id_map = engine["id_map"]
    bm25 = engine["bm25"]
    bm25_ids = engine["bm25_ids"]
    id_to_chunk = engine["id_to_chunk"]

    q_vec = emb_model.encode([query], convert_to_numpy=True)
    distances, indices = index.search(q_vec.astype(np.float32), top_k_dense)

    dense_scores: Dict[str, float] = {}
    dense_ids: List[str] = []
    for i, d in zip(indices[0], distances[0]):
        if i < 0:
            continue
        chunk_id = None
        if str(i) in id_map:
            chunk_id = id_map[str(i)]
        elif int(i) in id_map:
            chunk_id = id_map[int(i)]
        elif i in id_map:
            chunk_id = id_map[i]
        if chunk_id is None:
            continue

        cid = str(chunk_id)
        dense_ids.append(cid)
        dense_scores[cid] = float(1.0 / (1.0 + max(float(d), 0.0)))

    tokens = query.split()
    bm25_all_scores = bm25.get_scores(tokens)
    top_bm25_idx = list(np.argsort(bm25_all_scores)[-top_k_bm25:][::-1])

    bm25_scores: Dict[str, float] = {}
    bm25_ids_selected: List[str] = []
    for idx in top_bm25_idx:
        cid = str(bm25_ids[idx])
        bm25_ids_selected.append(cid)
        bm25_scores[cid] = float(bm25_all_scores[idx])

    dense_norm = _normalize_scores(dense_scores)
    bm25_norm = _normalize_scores(bm25_scores)

    lam = dynamic_lambda(query)
    candidate_ids: List[str] = []
    for cid in dense_ids + bm25_ids_selected:
        if cid not in candidate_ids:
            candidate_ids.append(cid)

    combined: List[Tuple[str, float, float, float]] = []
    for cid in candidate_ids:
        sem = dense_norm.get(cid, 0.0)
        lex = bm25_norm.get(cid, 0.0)
        final = lam * sem + (1.0 - lam) * lex
        combined.append((cid, sem, lex, final))

    combined.sort(key=lambda x: x[3], reverse=True)
    top_combined = combined[: max(re_rank_k, 1)]

    candidate_texts = [id_to_chunk[cid]["text"] for cid, _, _, _ in top_combined if cid in id_to_chunk]
    reranked_texts, rerank_scores = rerank(query, candidate_texts, top_k=min(re_rank_k, len(candidate_texts)))

    text_to_rerank = {t: float(s) for t, s in zip(reranked_texts, rerank_scores)}

    results: List[Dict[str, Any]] = []
    for cid, sem, lex, final in top_combined:
        chunk = id_to_chunk.get(cid)
        if not chunk:
            continue
        text = chunk.get("text", "")
        rerank_score = text_to_rerank.get(text)
        source_name = chunk.get("source_document") or chunk.get("source") or "unknown"
        result = {
            **chunk,
            "chunk_id": cid,
            "semantic_score": round(float(sem), 4),
            "lexical_score": round(float(lex), 4),
            "hybrid_score": round(float(final), 4),
            "rerank_score": round(float(rerank_score), 4) if rerank_score is not None else None,
            "source": source_name,
            "page": chunk.get("page_index"),
        }
        results.append(result)

    results.sort(key=lambda c: (c.get("rerank_score") is not None, c.get("rerank_score") or c.get("hybrid_score", 0.0)), reverse=True)

    _QUERY_CACHE[cache_key] = results
    log_event(
        "adaptive_retrieval",
        {
            "query": query,
            "lambda_semantic": lam,
            "query_type": classify_query_type(query),
            "results": [r.get("chunk_id") for r in results],
            "cached": False,
        },
    )

    return {
        "query": query,
        "lambda_semantic": lam,
        "results": results,
        "cached": False,
    }
