import fitz  # PyMuPDF
from .utils import make_id
import re

def extract_text_pages(file_path):
    """
    Returns list of pages: [{page_index:int, text:str, page_id:str}]
    We keep original page boundaries for traceability.
    """
    pages = []
    with fitz.open(file_path) as pdf:
        for i in range(len(pdf)):
            page = pdf[i]
            raw = page.get_text("text")
            # basic cleanup: remove multiple blank lines, normalize spacing
            text = re.sub(r'\r\n?', '\n', raw)
            text = re.sub(r'\n{2,}', '\n\n', text).strip()
            if not text:
                continue
            pages.append({"page_index": i+1, "text": text, "page_id": make_id("p")})
    return pages
