from sentence_transformers import CrossEncoder
from .config import CROSS_ENCODER_MODEL
from tqdm import tqdm

_cross_encoder = None

def get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        _cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)
    return _cross_encoder

def rerank(query, candidate_texts, top_k=None):
    model = get_cross_encoder()
    pairs = [[query, txt] for txt in candidate_texts]
    scores = model.predict(pairs)
    ranked = sorted(zip(candidate_texts, scores), key=lambda x: x[1], reverse=True)
    if top_k:
        ranked = ranked[:top_k]
    return [t for t,s in ranked], [s for t,s in ranked]
