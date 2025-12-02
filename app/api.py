from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import tempfile
import os
from pathlib import Path
import asyncio
import json
from datetime import datetime
from typing import Optional

# Import your existing modules
from .pdf_parser import extract_text_pages
from .chunking import chunk_pages
from .indexer import build_faiss_index
from .bm25_search import build_bm25
from .retrieval import hybrid_search
from .summarizer import map_reduce_summarize
from .extractive_summarizer import extractive_summarize
from .utils import write_json
from .config import FAISS_DIR, META_DIR

app = FastAPI(title="MedRAG Open Source API", version="2.0.0", description="Open source medical document analysis platform")

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
async def upload_and_analyze(
    file: UploadFile = File(...), 
    summary_type: str = Form(default="abstractive")
):
    """
    Handle PDF upload and return summarization
    Supports both extractive and abstractive summarization
    Open source - no authentication required
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
            # Process the PDF
            
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
            
            # 6. Generate summary based on type
            print(f"Step 6: Generating {summary_type} summary...")
            
            if summary_type.lower() == "extractive":
                # Use extractive summarization
                summary = extractive_summarize(retrieved, num_sentences=12)
                summary_method = "Extractive"
            else:
                # Use abstractive summarization (default)
                summary = map_reduce_summarize(retrieved)
                summary_method = "Abstractive"
            
            print(f"{summary_method} summary generated successfully")
            
            # Return results
            return JSONResponse(content={
                "success": True,
                "summary": summary,
                "summary_type": summary_method,
                "stats": {
                    "pages": len(pages),
                    "chunks": len(chunks),
                    "characters": sum(len(c['text']) for c in chunks),
                    "method": summary_method
                },
                "message": "Analysis complete! No authentication required - unlimited use available."
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

@app.post("/search")
async def search_endpoint(payload: dict):
    """Search endpoint used by frontend. Expects JSON {"query": "..."} and returns matching chunks."""
    try:
        query = payload.get('query', '').strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

        results = hybrid_search(query, str(META_DIR))

        # Ensure results are JSON serializable (they should be dicts loaded from metadata)
        return JSONResponse(content={"results": results})
    except HTTPException:
        raise
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "MedRAG Open Source API",
        "version": "2.0.0",
        "features": {
            "authentication": False,
            "usage_limits": False,
            "open_source": True,
            "unlimited_uploads": True
        }
    }

@app.get("/info")
async def app_info():
    """Application information endpoint"""
    return {
        "name": "MedAnalyzer Pro - Open Source Edition",
        "version": "2.0.0",
        "description": "Open source medical document analysis platform with unlimited usage",
        "features": [
            "PDF document upload and analysis",
            "AI-powered medical text summarization",
            "Hybrid search (BM25 + semantic)",
            "Extractive and abstractive summarization",
            "Export functionality",
            "No authentication required",
            "Unlimited document processing"
        ],
        "endpoints": {
            "/": "Main application interface",
            "/upload": "Upload and analyze medical documents",
            "/search": "Search through analyzed documents",
            "/health": "Health check",
            "/info": "Application information"
        },
        "license": "Open Source",
        "github": "https://github.com/your-repo/medanalyzer"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)