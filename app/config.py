import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
FAISS_DIR = DATA_DIR / "faiss_index"
META_DIR = DATA_DIR / "metadata"
BM25_DIR = DATA_DIR / "bm25_index"
LOG_DIR = ROOT / "logs"

# Grok API
GROK_API_URL = os.getenv("GROK_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")

# Embeddings / models
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2")
CROSS_ENCODER_MODEL = os.getenv("CROSS_ENCODER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

# Chunking
CHUNK_TOKENS = int(os.getenv("CHUNK_TOKENS", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))

# Retrieval
HNSW_M = int(os.getenv("HNSW_M", 32))
HNSW_EF_CONSTRUCTION = int(os.getenv("HNSW_EF_CONSTRUCTION", 200))
TOP_K_DENSE = int(os.getenv("TOP_K_DENSE", 16))
TOP_K_BM25 = int(os.getenv("TOP_K_BM25", 20))
RE_RANK_K = int(os.getenv("RE_RANK_K", 12))

# Summarization settings
SUMMARIZE_BATCH_TOKENS = int(os.getenv("SUMMARIZE_BATCH_TOKENS", 3500))
MODEL_FOR_SUMMARIZATION = os.getenv("GROK_MODEL", "llama3-8b-8192")

# Misc
VERBOSE = os.getenv("VERBOSE", "1") == "1"
