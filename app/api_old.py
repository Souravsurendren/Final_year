from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import tempfile
import os
from pathlib import Path
import asyncio
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr

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

# Security
security = HTTPBearer(auto_error=False)

# Pydantic models for authentication
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    is_premium: bool = True

# In-memory user storage (replace with database in production)
users_db = {}
sessions_db = {}

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate secure session token"""
    return secrets.token_urlsafe(32)

# Create demo users for testing
def create_demo_users():
    """Create demo users for testing"""
    demo_users = [
        {
            'name': 'Dr. Sarah Johnson',
            'email': 'demo@medanalyzer.com',
            'password': 'demo123'
        },
        {
            'name': 'Dr. Michael Chen',
            'email': 'test@medanalyzer.com', 
            'password': 'test123'
        }
    ]
    
    for demo_user in demo_users:
        user_id = secrets.token_urlsafe(16)
        user = {
            'id': user_id,
            'name': demo_user['name'],
            'email': demo_user['email'],
            'password_hash': hash_password(demo_user['password']),
            'created_at': datetime.now(),
            'is_premium': True
        }
        users_db[user_id] = user

# Initialize demo users
create_demo_users()

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """Get current authenticated user"""
    if not credentials:
        return None
    
    session = sessions_db.get(credentials.credentials)
    if not session or session['expires'] < datetime.now():
        return None
    
    user_data = users_db.get(session['user_id'])
    if not user_data:
        return None
    
    return User(**user_data)

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main HTML page"""
    html_file = Path("static/index.html")
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text(encoding='utf-8'), status_code=200)
    else:
        return HTMLResponse(content="<h1>Frontend not found</h1>", status_code=404)

@app.post("/api/signup")
async def signup(user_data: UserSignup):
    """Register a new user"""
    try:
        # Check if user already exists
        for user in users_db.values():
            if user['email'] == user_data.email:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_id = secrets.token_urlsafe(16)
        user = {
            'id': user_id,
            'name': user_data.name,
            'email': user_data.email,
            'password_hash': hash_password(user_data.password),
            'created_at': datetime.now(),
            'is_premium': True
        }
        
        users_db[user_id] = user
        
        # Create session
        token = generate_token()
        sessions_db[token] = {
            'user_id': user_id,
            'expires': datetime.now() + timedelta(days=30)
        }
        
        # Return user data (without password)
        user_response = User(**{k: v for k, v in user.items() if k != 'password_hash'})
        
        return {
            'user': user_response,
            'token': token,
            'message': 'Account created successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/login")
async def login(user_data: UserLogin):
    """Authenticate user login"""
    try:
        # Find user by email
        user = None
        for u in users_db.values():
            if u['email'] == user_data.email:
                user = u
                break
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if user['password_hash'] != hash_password(user_data.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create session
        token = generate_token()
        sessions_db[token] = {
            'user_id': user['id'],
            'expires': datetime.now() + timedelta(days=30)
        }
        
        # Return user data (without password)
        user_response = User(**{k: v for k, v in user.items() if k != 'password_hash'})
        
        return {
            'user': user_response,
            'token': token,
            'message': 'Login successful'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/logout")
async def logout(current_user: Optional[User] = Depends(get_current_user)):
    """Logout user and invalidate session"""
    if current_user:
        # Remove all sessions for this user
        sessions_to_remove = []
        for token, session in sessions_db.items():
            if session['user_id'] == current_user.id:
                sessions_to_remove.append(token)
        
        for token in sessions_to_remove:
            del sessions_db[token]
    
    return {'message': 'Logged out successfully'}

@app.get("/api/me")
async def get_current_user_info(current_user: Optional[User] = Depends(get_current_user)):
    """Get current user information"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return current_user

from fastapi import FastAPI, File, UploadFile, HTTPException, Form

@app.post("/upload")
async def upload_and_analyze(
    file: UploadFile = File(...), 
    summary_type: str = Form(default="abstractive"),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Handle PDF upload and return summarization
    Supports both extractive and abstractive summarization
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
if __name__ == "__main__":
    # Create static directory if it doesn't exist
    Path("static").mkdir(exist_ok=True)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)