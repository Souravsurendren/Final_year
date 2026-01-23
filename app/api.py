from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
from .medical_nlp import (
    full_medical_analysis,
    extract_medical_entities,
    get_icd10_codes,
    check_drug_interactions,
    expand_medical_abbreviations,
    analyze_clinical_sentiment
)
from .medical_vision import analyze_medical_image
from .medical_chatbot import (
    set_chatbot_context,
    chat_with_document,
    get_suggested_questions,
    clear_chat_history
)
from .lab_trends import (
    extract_and_store_lab_values,
    get_lab_trends,
    get_latest_lab_values,
    clear_lab_trends
)
from .translator import translate_summary
from .risk_calculator import calculate_risks

app = FastAPI(title="MedRAG Open Source API", version="2.0.0", description="Open source medical document analysis platform")

# Middleware to handle ngrok browser warning bypass
class NgrokMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add headers to bypass ngrok browser warning
        response.headers["ngrok-skip-browser-warning"] = "true"
        return response

# Add ngrok middleware
app.add_middleware(NgrokMiddleware)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ngrok-skip-browser-warning"]
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
            
            # 7. Perform Medical NLP Analysis
            print("Step 7: Performing Medical NLP analysis...")
            full_text = " ".join([c['text'] for c in chunks])
            try:
                nlp_analysis = full_medical_analysis(full_text)
                print(f"Medical NLP analysis complete: {nlp_analysis['entities']['total_count']} entities, {nlp_analysis['icd10_codes']['total_count']} ICD codes")
            except Exception as nlp_error:
                print(f"Warning: Medical NLP analysis failed: {nlp_error}")
                nlp_analysis = None
            
            # 8. Set chatbot context for Q&A
            print("Step 8: Setting up chatbot context...")
            try:
                set_chatbot_context(summary, nlp_analysis)
                suggested_questions = get_suggested_questions()
                print(f"Chatbot ready with {len(suggested_questions)} suggested questions")
            except Exception as chat_error:
                print(f"Warning: Chatbot setup failed: {chat_error}")
                suggested_questions = []
            
            # 9. Extract lab values for trend tracking
            print("Step 9: Extracting lab values for trend analysis...")
            try:
                lab_result = extract_and_store_lab_values(full_text, file.filename)
                print(f"Extracted {lab_result['extracted_count']} lab values")
            except Exception as lab_error:
                print(f"Warning: Lab value extraction failed: {lab_error}")
                lab_result = {"extracted_count": 0, "values": []}

            # 10. Calculate Health Risks
            print("Step 10: Calculating health risks...")
            try:
                # Use extracted lab values + text keywords for demographics
                risk_profile = calculate_risks(full_text, lab_result.get("values", []))
            except Exception as risk_error:
                print(f"Warning: Risk calculation failed: {risk_error}")
                risk_profile = None
            
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
                "nlp_analysis": nlp_analysis,
                "chatbot": {
                    "enabled": True,
                    "suggested_questions": suggested_questions
                },
                "lab_values": {
                    "extracted_count": lab_result.get("extracted_count", 0),
                    "values": lab_result.get("values", [])
                },
                "risk_profile": risk_profile,
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


@app.post("/upload-image")
async def upload_and_analyze_image(file: UploadFile = File(...)):
    """
    Handle medical image upload and return AI analysis
    Supports: X-rays, CT, MRI, Ultrasound, Pathology slides
    Formats: JPEG, PNG, DICOM (converted), BMP, TIFF
    """
    import traceback
    
    try:
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp']
        file_ext = os.path.splitext(file.filename.lower())[1]
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported image format. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Check file size (max 20MB)
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file too large. Maximum size is 20MB.")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Analyze the medical image
            print(f"Analyzing medical image: {file.filename}")
            analysis = analyze_medical_image(tmp_path)
            
            print(f"Analysis complete - Type: {analysis.get('image_type')}, Abnormalities: {analysis.get('abnormalities_detected')}")
            
            return JSONResponse(content={
                "success": True,
                "filename": file.filename,
                "analysis": analysis,
                "message": "Medical image analysis complete!"
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in image analysis endpoint: {error_details}")
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")


# ========================================
# CHATBOT ENDPOINTS
# ========================================

@app.post("/chat")
async def chat_endpoint(payload: dict):
    """
    Chatbot endpoint for document Q&A
    Expects JSON {"message": "user question"}
    Returns AI response based on analyzed document
    """
    try:
        message = payload.get('message', '').strip()
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Get response from chatbot
        result = chat_with_document(message)
        
        return JSONResponse(content={
            "success": result.get("success", False),
            "response": result.get("response", ""),
            "source": result.get("source", "unknown"),
            "processing_time": result.get("processing_time", 0)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")


@app.get("/chat/suggestions")
async def chat_suggestions():
    """Get suggested questions for the chatbot"""
    try:
        suggestions = get_suggested_questions()
        return JSONResponse(content={
            "success": True,
            "suggestions": suggestions
        })
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "suggestions": []
        })


@app.post("/chat/clear")
async def chat_clear():
    """Clear chat history"""
    try:
        clear_chat_history()
        return JSONResponse(content={
            "success": True,
            "message": "Chat history cleared"
        })
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "message": str(e)
        })


# ========================================
# LAB TRENDS ENDPOINTS
# ========================================

@app.get("/lab-trends")
async def get_trends_endpoint(lab_name: Optional[str] = None):
    """
    Get lab value trends for visualization
    Optional: filter by lab_name (e.g., "HbA1c", "Fasting Glucose")
    """
    try:
        trends = get_lab_trends(lab_name)
        return JSONResponse(content=trends)
    except Exception as e:
        print(f"Lab trends error: {e}")
        return JSONResponse(content={
            "success": False,
            "error": str(e)
        })


@app.get("/lab-trends/latest")
async def get_latest_endpoint():
    """Get the most recent value for each lab type"""
    try:
        latest = get_latest_lab_values()
        return JSONResponse(content=latest)
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "error": str(e)
        })


@app.post("/lab-trends/clear")
async def clear_trends_endpoint():
    """Clear all lab trend data"""
    try:
        result = clear_lab_trends()
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "error": str(e)
        })



# ========================================
# TRANSLATION ENDPOINTS
# ========================================

@app.post("/translate")
async def translate_endpoint(payload: dict):
    """
    Translate summary to target language
    Expects JSON {"text": "...", "language": "hi"}
    """
    try:
        text = payload.get('text', '').strip()
        language = payload.get('language', '').strip()
        
        if not text or not language:
            raise HTTPException(status_code=400, detail="Text and language are required")
        
        result = translate_summary(text, language)
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"Translation error: {e}")
        return JSONResponse(content={
            "success": False,
            "error": str(e)
        })


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
        "version": "2.1.0",
        "description": "Open source medical document analysis platform with advanced NLP capabilities",
        "features": [
            "PDF document upload and analysis",
            "AI-powered medical text summarization",
            "Hybrid search (BM25 + semantic)",
            "Extractive and abstractive summarization",
            "Named Entity Recognition (NER)",
            "ICD-10 Code Mapping",
            "Drug Interaction Detection",
            "Medical Abbreviation Expansion",
            "Clinical Sentiment Analysis",
            "Export functionality",
            "No authentication required",
            "Unlimited document processing"
        ],
        "endpoints": {
            "/": "Main application interface",
            "/upload": "Upload and analyze medical documents",
            "/search": "Search through analyzed documents",
            "/health": "Health check",
            "/info": "Application information",
            "/nlp/entities": "Extract medical entities (NER)",
            "/nlp/icd10": "Map text to ICD-10 codes",
            "/nlp/interactions": "Check drug interactions",
            "/nlp/abbreviations": "Expand medical abbreviations",
            "/nlp/sentiment": "Analyze clinical sentiment",
            "/nlp/full-analysis": "Complete medical NLP analysis"
        },
        "license": "Open Source",
        "github": "https://github.com/your-repo/medanalyzer"
    }

# ============================================================================
# MEDICAL NLP ENDPOINTS
# ============================================================================

@app.post("/nlp/entities")
async def nlp_extract_entities(payload: dict):
    """
    Extract medical entities from text using Named Entity Recognition (NER)
    Identifies: diseases, drugs, procedures, anatomy, symptoms, lab tests
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = extract_medical_entities(text)
        return JSONResponse(content={
            "success": True,
            "entities": result["entities"],
            "summary": result["summary"],
            "total_count": len(result["entities"])
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")

@app.post("/nlp/icd10")
async def nlp_icd10_mapping(payload: dict):
    """
    Map conditions mentioned in text to ICD-10 diagnosis codes
    Returns matching codes with descriptions and categories
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        codes = get_icd10_codes(text)
        return JSONResponse(content={
            "success": True,
            "icd10_codes": codes,
            "total_count": len(codes)
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ICD-10 mapping failed: {str(e)}")

@app.post("/nlp/interactions")
async def nlp_drug_interactions(payload: dict):
    """
    Detect potential drug-drug interactions from medication list in text
    Returns interactions with severity levels and recommendations
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        interactions = check_drug_interactions(text)
        has_major = any(i.get('severity') == 'MAJOR' for i in interactions)
        
        return JSONResponse(content={
            "success": True,
            "interactions": interactions,
            "total_count": len(interactions),
            "has_major_interactions": has_major,
            "warning": "⚠️ MAJOR drug interactions detected! Review immediately." if has_major else None
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drug interaction check failed: {str(e)}")

@app.post("/nlp/abbreviations")
async def nlp_expand_abbreviations(payload: dict):
    """
    Expand medical abbreviations in text
    Returns expanded text and list of all expansions made
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = expand_medical_abbreviations(text)
        return JSONResponse(content={
            "success": True,
            "expanded_text": result["expanded_text"],
            "expansions": result["expansions"],
            "total_expansions": len(result["expansions"])
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Abbreviation expansion failed: {str(e)}")

@app.post("/nlp/sentiment")
async def nlp_sentiment_analysis(payload: dict):
    """
    Analyze sentiment in clinical text
    Focuses on patient condition, prognosis, and clinical outcomes
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = analyze_clinical_sentiment(text)
        return JSONResponse(content={
            "success": True,
            "sentiments": result["sentiments"],
            "overall": result["overall"]
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")

@app.post("/nlp/full-analysis")
async def nlp_full_analysis(payload: dict):
    """
    Perform comprehensive medical NLP analysis on text
    Includes: NER, ICD-10 mapping, drug interactions, abbreviation expansion, sentiment analysis
    """
    try:
        text = payload.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = full_medical_analysis(text)
        return JSONResponse(content={
            "success": True,
            "analysis": result
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)