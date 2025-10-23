import faiss, numpy as np, os
from sentence_transformers import SentenceTransformer
from .config import EMBEDDING_MODEL, FAISS_DIR, HNSW_M, HNSW_EF_CONSTRUCTION
from .utils import write_json, read_json
from pathlib import Path

Path(FAISS_DIR).mkdir(parents=True, exist_ok=True)

def build_faiss_index(chunks, persist=True):
    """
    chunks: list of dicts with 'chunk_id' and 'text'
    returns: index, model, id_map
    """
    texts = [c["text"] for c in chunks]
    ids = [c["chunk_id"] for c in chunks]
    model = SentenceTransformer(EMBEDDING_MODEL)
    vectors = model.encode(texts, show_progress_bar=True, convert_to_numpy=True,normalize_embeddings=True)

    dim = vectors.shape[1]
    # HNSW index
    index = faiss.IndexHNSWFlat(dim, HNSW_M)
    index.hnsw.efConstruction = HNSW_EF_CONSTRUCTION
    index = faiss.IndexIDMap(index)
    index.add_with_ids(vectors, np.array(range(len(ids))))
    id_map = {i: ids[i] for i in range(len(ids))}

    if persist:
        faiss.write_index(index, str(Path(FAISS_DIR) / "medical_hnsw.index"))
        write_json(Path(FAISS_DIR) / "id_map.json", id_map)

    return index, model, id_map

def load_faiss():
    idx_path = Path(FAISS_DIR) / "medical_hnsw.index"
    id_map_path = Path(FAISS_DIR) / "id_map.json"
    assert idx_path.exists() and id_map_path.exists(), "Index not found. Build index first."
    index = faiss.read_index(str(idx_path))
    id_map = read_json(str(id_map_path))
    model = SentenceTransformer(EMBEDDING_MODEL)
    return index, model, id_map
