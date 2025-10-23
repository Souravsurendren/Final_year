import numpy as np
from .indexer import load_faiss
from .bm25_search import load_bm25
from .reranker import rerank
from .config import TOP_K_DENSE, TOP_K_BM25, RE_RANK_K
from .utils import read_json, log_event
from pathlib import Path
import json

# helper to fetch chunk texts from metadata store (metadata stored separately)
def load_chunk_metadata(meta_dir):
    # meta_dir contains one json file with list of chunks or many chunk files
    chunks_path = Path(meta_dir) / "chunks.json"
    if chunks_path.exists():
        return json.loads(open(chunks_path,'r',encoding='utf-8').read())
    # fallback: collect all json files
    all_chunks = []
    for f in Path(meta_dir).glob("*.json"):
        all_chunks.extend(json.loads(open(f,'r',encoding='utf-8').read()))
    return all_chunks

def hybrid_search(query, meta_dir, top_k_dense=TOP_K_DENSE, top_k_bm25=TOP_K_BM25, re_rank_k=RE_RANK_K):
    index, emb_model, id_map = load_faiss()
    bm25, bm25_ids = load_bm25()
    chunks = load_chunk_metadata(meta_dir)
    id_to_chunk = {c["chunk_id"]: c for c in chunks}

    # dense search
    q_vec = emb_model.encode([query], convert_to_numpy=True)
    distances, indices = index.search(q_vec.astype(np.float32), top_k_dense)
    
    # handle mapping type: id_map keys can be either string or int
    dense_chunk_ids = []
    for i in indices[0]:
        if i < len(id_map):  # Ensure index is valid
            # Try different key formats
            chunk_id = None
            if str(i) in id_map:
                chunk_id = id_map[str(i)]
            elif int(i) in id_map:
                chunk_id = id_map[int(i)]
            elif i in id_map:
                chunk_id = id_map[i]
            
            if chunk_id is not None:
                dense_chunk_ids.append(chunk_id)

    # bm25 search
    tokens = query.split()
    bm25_scores = bm25.get_scores(tokens)
    top_bm25_idx = list(np.argsort(bm25_scores)[-top_k_bm25:][::-1])
    bm25_chunk_ids = [bm25_ids[i] for i in top_bm25_idx]

    # union candidate ids (preserve order)
    candidate_ids = []
    for cid in dense_chunk_ids + bm25_chunk_ids:
        if cid and cid not in candidate_ids:
            candidate_ids.append(cid)

    candidate_texts = [id_to_chunk[cid]["text"] for cid in candidate_ids if cid in id_to_chunk]

    # re-rank top N
    reranked_texts, scores = rerank(query, candidate_texts[:re_rank_k], top_k=re_rank_k)
    final_candidates = reranked_texts

    # return chunk objects in final order
    final_chunk_objs = [id_to_chunk[next(cid for cid in candidate_ids if id_to_chunk[cid]["text"]==txt)] for txt in final_candidates]
    # log
    log_event("retrieval", {"query": query, "candidates": [c["chunk_id"] for c in final_chunk_objs]})
    return final_chunk_objs
