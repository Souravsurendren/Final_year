from langchain.text_splitter import RecursiveCharacterTextSplitter
from .config import CHUNK_TOKENS, CHUNK_OVERLAP
from .utils import make_id, write_json
from pathlib import Path
import math, os

def chunk_pages(pages):
    """
    pages: list of {"page_index", "text", "page_id"}
    returns list of chunks with metadata:
    {"chunk_id","page_index","text","start_char","end_char","order"}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_TOKENS,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    all_chunks = []
    order = 0
    for p in pages:
        pieces = splitter.split_text(p["text"])
        char_cursor = 0
        for piece in pieces:
            start = p["text"].find(piece, char_cursor)
            end = start + len(piece) if start >= 0 else char_cursor
            chunk = {
                "chunk_id": make_id("c"),
                "page_id": p["page_id"],
                "page_index": p["page_index"],
                "order": order,
                "text": piece,
                "start_char": start,
                "end_char": end
            }
            all_chunks.append(chunk)
            order += 1
            char_cursor = end
    return all_chunks
