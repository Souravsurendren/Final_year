#!/usr/bin/env python3
"""
MedRAG Enterprise - Startup Script
FastAPI Medical Document Analysis Platform
"""

import uvicorn
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

if __name__ == "__main__":
    print("🏥 Starting MedRAG Enterprise Platform...")
    print("📁 Creating required directories...")
    
    # Ensure required directories exist
    dirs_to_create = ["static", "data", "data/faiss_index", "data/metadata", "data/bm25_index", "logs"]
    for dir_name in dirs_to_create:
        Path(dir_name).mkdir(parents=True, exist_ok=True)
    
    print("🚀 Launching FastAPI server...")
    print("🌐 Open your browser to: http://localhost:8000")
    print("📋 Upload a medical PDF to start analysis")
    print("=" * 50)
    
    uvicorn.run(
        "app.api:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=["app", "static"]
    )