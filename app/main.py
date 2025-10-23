import streamlit as st
from .pdf_parser import extract_text_pages
from .chunking import chunk_pages
from .indexer import build_faiss_index
from .bm25_search import build_bm25
from .retrieval import hybrid_search
from .summarizer import map_reduce_summarize
from .utils import write_json
from .config import FAISS_DIR, META_DIR
from pathlib import Path
import os, json, time

# Page configuration
st.set_page_config(
    page_title="MedRAG Enterprise | AI-Powered Medical Analysis",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for enterprise styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        animation: slideInDown 0.8s ease-out;
    }
    
    .main-title {
        color: white;
        font-family: 'Inter', sans-serif;
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
        text-align: center;
    }
    
    .main-subtitle {
        color: rgba(255,255,255,0.9);
        font-family: 'Inter', sans-serif;
        font-size: 1.1rem;
        font-weight: 400;
        text-align: center;
        margin-top: 0.5rem;
    }
    
    .feature-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        margin: 1rem 0;
        border-left: 4px solid #667eea;
        transition: all 0.3s ease;
        animation: fadeInUp 0.6s ease-out;
    }
    
    .feature-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .step-container {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 10px;
        margin: 1rem 0;
        border-left: 4px solid #10b981;
        animation: slideInLeft 0.5s ease-out;
    }
    
    .progress-container {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin: 0.5rem 0;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
    }
    
    .stat-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        animation: bounceIn 0.6s ease-out;
    }
    
    .stat-number {
        font-size: 2rem;
        font-weight: 700;
        display: block;
    }
    
    .stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-top: 0.5rem;
    }
    
    @keyframes slideInDown {
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
    }
    
    .upload-zone {
        border: 2px dashed #667eea;
        border-radius: 15px;
        padding: 3rem;
        text-align: center;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        transition: all 0.3s ease;
    }
    
    .upload-zone:hover {
        border-color: #764ba2;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    }
    
    .sidebar-content {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    
    .processing-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-radius: 50%;
        border-top: 2px solid #667eea;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .summary-container {
        background: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        margin: 2rem 0;
        border-top: 4px solid #10b981;
    }
    
    .summary-header {
        color: #1f2937;
        font-family: 'Inter', sans-serif;
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.markdown("""
    <div class="sidebar-content">
        <h3>🏥 MedRAG Enterprise</h3>
        <p><strong>AI-Powered Medical Document Analysis</strong></p>
        <hr>
        <h4>🔧 System Features</h4>
        <ul>
            <li>📄 Advanced PDF Processing</li>
            <li>🧠 Neural Text Chunking</li>
            <li>🔍 Hybrid Search (FAISS + BM25)</li>
            <li>🎯 Cross-Encoder Re-ranking</li>
            <li>📋 Map-Reduce Summarization</li>
            <li>🇮🇳 Indian Medical Guidelines</li>
        </ul>
        <hr>
        <h4>📊 Compliance Standards</h4>
        <ul>
            <li>ICMR Guidelines</li>
            <li>NMC Protocols</li>
            <li>NABH Standards</li>
            <li>Healthcare Data Privacy</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)

# Main header
st.markdown("""
<div class="main-header">
    <h1 class="main-title">🏥 MedRAG Enterprise Suite</h1>
    <p class="main-subtitle">Advanced AI-Powered Medical Document Analysis & Summarization Platform</p>
</div>
""", unsafe_allow_html=True)

# Feature overview
col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="feature-card">
        <h3>🚀 Enterprise-Grade Processing</h3>
        <p>Leverages state-of-the-art NLP models with FAISS HNSW indexing for lightning-fast document retrieval and analysis.</p>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="feature-card">
        <h3>🇮🇳 Indian Medical Compliance</h3>
        <p>Strictly adheres to ICMR, NMC, and NABH guidelines for accurate medical interpretation and recommendations.</p>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="feature-card">
        <h3>🔒 Secure & Auditable</h3>
        <p>Enterprise-level security with comprehensive audit trails and logging for regulatory compliance.</p>
    </div>
    """, unsafe_allow_html=True)

# File upload section
st.markdown("## 📄 Document Upload & Processing")

uploaded = st.file_uploader(
    "",
    type=["pdf"],
    help="Upload medical reports (3-8 pages recommended for optimal processing)",
    key="pdf_uploader"
)

if uploaded is None:
    st.markdown("""
    <div class="upload-zone">
        <h3>📁 Drop Your Medical PDF Here</h3>
        <p>Supported formats: PDF documents up to 10MB</p>
        <p><em>Optimal: 3-8 pages for comprehensive analysis</em></p>
    </div>
    """, unsafe_allow_html=True)
else:
    # Create progress tracking
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    # Statistics container
    stats_container = st.empty()
    
    tmp_path = "temp_uploaded.pdf"
    with open(tmp_path, "wb") as f:
        f.write(uploaded.read())

    # Step 1: Extract pages
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 1: Extracting Document Pages</h4>
        <p>Processing PDF structure and extracting text content...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(15)
    
    pages = extract_text_pages(tmp_path)
    time.sleep(0.5)  # Animation delay
    
    # Step 2: Chunking
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 2: Intelligent Text Chunking</h4>
        <p>Applying recursive chunking with overlap for optimal context preservation...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(30)
    
    chunks = chunk_pages(pages)
    time.sleep(0.5)
    
    # Display statistics
    stats_container.markdown(f"""
    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-number">{len(pages)}</span>
            <div class="stat-label">Pages Extracted</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">{len(chunks)}</span>
            <div class="stat-label">Chunks Created</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">{sum(len(c['text']) for c in chunks):,}</span>
            <div class="stat-label">Characters Processed</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Persist chunk metadata
    Path(META_DIR).mkdir(parents=True, exist_ok=True)
    write_json(Path(META_DIR)/"chunks.json", chunks)

    # Step 3: Build FAISS index
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 3: Building Neural Search Index</h4>
        <p>Creating FAISS HNSW embeddings for semantic similarity search...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(50)
    
    index, emb_model, id_map = build_faiss_index(chunks, persist=True)
    time.sleep(0.5)

    # Step 4: Build BM25 index
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 4: Building Lexical Search Index</h4>
        <p>Creating BM25 index for keyword-based retrieval...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(65)
    
    bm25, ids = build_bm25(chunks, persist=True)
    time.sleep(0.5)

    # Step 5: Hybrid retrieval
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 5: Hybrid Information Retrieval</h4>
        <p>Executing hybrid search combining semantic and lexical matching...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(80)
    
    retrieved = hybrid_search("Summarize full report comprehensively", META_DIR)
    
    # Ensure full coverage
    all_chunk_ids = [c["chunk_id"] for c in chunks]
    retrieved_ids = [c["chunk_id"] for c in retrieved]
    missing_ids = [cid for cid in all_chunk_ids if cid not in retrieved_ids]
    if missing_ids:
        st.warning(f"⚠️ {len(missing_ids)} chunks missing in retrieval - adding for complete coverage")
        retrieved.extend([c for c in chunks if c["chunk_id"] in missing_ids])

    # Step 6: Summarization
    status_text.markdown("""
    <div class="step-container">
        <h4><span class="processing-spinner"></span> Step 6: AI-Powered Medical Summarization</h4>
        <p>Applying map-reduce summarization with Indian medical guidelines...</p>
    </div>
    """, unsafe_allow_html=True)
    progress_bar.progress(95)
    
    summary = map_reduce_summarize(retrieved)
    progress_bar.progress(100)
    
    # Clear status and show completion
    status_text.empty()
    
    st.markdown("""
    <div class="step-container" style="border-left-color: #10b981;">
        <h4>✅ Processing Complete</h4>
        <p>Document analysis completed successfully. All data archived for audit trail.</p>
    </div>
    """, unsafe_allow_html=True)

    # Display summary
    st.markdown(f"""
    <div class="summary-container">
        <h2 class="summary-header">📋 Comprehensive Medical Analysis Report</h2>
        <div style="background: #f0f9f4; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <strong>🇮🇳 Analyzed according to Indian Medical Guidelines (ICMR/NMC/NABH)</strong>
        </div>
        <div style="line-height: 1.6; font-size: 1.05rem;">
            {summary.replace('\n', '<br>')}
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Processing stats
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("📄 Pages Processed", len(pages))
    with col2:
        st.metric("🔍 Chunks Retrieved", len(retrieved))
    with col3:
        st.metric("📊 Total Characters", f"{sum(len(c['text']) for c in chunks):,}")
    with col4:
        st.metric("⏱️ Processing Status", "Complete ✅")

    # Footer
    st.markdown("""
    ---
    <div style="text-align: center; color: #6b7280; padding: 2rem;">
        <p><strong>MedRAG Enterprise Suite</strong> | Advanced Medical Document Analysis Platform</p>
        <p>🔒 All processing data archived in <code>data/</code> and <code>logs/</code> directories for compliance audit</p>
        <p><em>Powered by enterprise-grade AI models with Indian medical guideline compliance</em></p>
    </div>
    """, unsafe_allow_html=True)
