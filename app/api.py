from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
from pathlib import Path
import asyncio
import json

# Import your existing modules
from .pdf_parser import extract_text_pages
from .chunking import chunk_pages
from .indexer import build_faiss_index
from .bm25_search import build_bm25
from .retrieval import hybrid_search
from .summarizer import map_reduce_summarize
from .utils import write_json
from .config import FAISS_DIR, META_DIR

app = FastAPI(title="MedRAG Enterprise API", version="1.0.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main HTML page"""
    html_file = Path("static/index.html")
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text(encoding='utf-8'), status_code=200)
    else:
        return HTMLResponse(content="<h1>Frontend not found</h1>", status_code=404)

@app.post("/upload")
async def upload_and_analyze(file: UploadFile = File(...)):
    """
    Handle PDF upload and return summarization
    """
    import traceback
    
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
            # Process the PDF (same logic as Streamlit but simplified)
            
            # 1. Extract pages
            print("Step 1: Extracting pages...")
            pages = extract_text_pages(tmp_path)
            if not pages:
                raise HTTPException(status_code=400, detail="Could not extract text from PDF")
            print(f"Extracted {len(pages)} pages")
            
            # 2. Chunk pages
            print("Step 2: Chunking pages...")
            chunks = chunk_pages(pages)
            print(f"Created {len(chunks)} chunks")
            
            # 3. Persist metadata
            print("Step 3: Persisting metadata...")
            Path(META_DIR).mkdir(parents=True, exist_ok=True)
            write_json(Path(META_DIR)/"chunks.json", chunks)
            print("Metadata saved")
            
            # 4. Build indices
            print("Step 4: Building indices...")
            index, emb_model, id_map = build_faiss_index(chunks, persist=True)
            print("FAISS index built")
            bm25, ids = build_bm25(chunks, persist=True)
            print("BM25 index built")
            
            # 5. Retrieve relevant chunks
            print("Step 5: Retrieving relevant chunks...")
            retrieved = hybrid_search("Summarize full report comprehensively", META_DIR)
            print(f"Retrieved {len(retrieved)} chunks")
            
            # Ensure coverage
            all_chunk_ids = [c["chunk_id"] for c in chunks]
            retrieved_ids = [c["chunk_id"] for c in retrieved]
            missing_ids = [cid for cid in all_chunk_ids if cid not in retrieved_ids]
            if missing_ids:
                retrieved.extend([c for c in chunks if c["chunk_id"] in missing_ids])
                print(f"Added {len(missing_ids)} missing chunks")
            
            # 6. Generate summary
            print("Step 6: Generating summary...")
            summary = map_reduce_summarize(retrieved)
            print("Summary generated successfully")
            
            # Return results
            return JSONResponse(content={
                "success": True,
                "summary": summary,
                "stats": {
                    "pages": len(pages),
                    "chunks": len(chunks),
                    "characters": sum(len(c['text']) for c in chunks)
                }
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the full traceback for debugging
        error_details = traceback.format_exc()
        print(f"Error in upload endpoint: {error_details}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "MedRAG Enterprise API"}

if __name__ == "__main__":
    # Create static directory if it doesn't exist
    Path("static").mkdir(exist_ok=True)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)