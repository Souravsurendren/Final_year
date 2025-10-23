from rank_bm25 import BM25Okapi
import os, pickle
from .config import BM25_DIR
from pathlib import Path

Path(BM25_DIR).mkdir(parents=True, exist_ok=True)

def build_bm25(chunks, persist=True):
    tokenized = [c["text"].split() for c in chunks]
    bm25 = BM25Okapi(tokenized)
    if persist:
        with open(Path(BM25_DIR)/"bm25.pkl", "wb") as f:
            pickle.dump({"bm25":bm25, "ids":[c["chunk_id"] for c in chunks]}, f)
    return bm25, [c["chunk_id"] for c in chunks]

def load_bm25():
    import pickle
    with open(Path(BM25_DIR)/"bm25.pkl", "rb") as f:
        obj = pickle.load(f)
    return obj["bm25"], obj["ids"]
