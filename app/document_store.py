"""
Document Store for MedRAG
Handles MongoDB storage for documents, analyses, and images
"""

from pymongo import MongoClient
from datetime import datetime
from typing import Optional, List, Dict
from bson.objectid import ObjectId


class DocumentStore:
    _instance = None
    
    def __new__(cls, mongodb_uri: str = None, db_name: str = None):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, mongodb_uri: str = None, db_name: str = None):
        """Initialize document store with MongoDB connection"""
        if self._initialized:
            return
        
        if not mongodb_uri or not db_name:
            raise ValueError("mongodb_uri and db_name required for first initialization")
        
        self.client = MongoClient(mongodb_uri, maxPoolSize=50)
        self.db = self.client[db_name]
        
        # Collections
        self.documents = self.db.documents
        self.analyses = self.db.analyses
        self.images = self.db.images
        
        # Create indexes
        self.documents.create_index([("user_id", 1), ("uploaded_at", -1)])
        self.analyses.create_index([("document_id", 1)])
        self.images.create_index([("user_id", 1), ("uploaded_at", -1)])
        
        self._initialized = True
    
    def store_document(self, user_id: str, filename: str, summary: str, 
                      summary_type: str, stats: Dict, metadata: Dict = None) -> str:
        """Store document analysis results"""
        doc = {
            "user_id": user_id,
            "filename": filename,
            "summary": summary,
            "summary_type": summary_type,
            "stats": stats,
            "metadata": metadata or {},
            "uploaded_at": datetime.utcnow()
        }
        result = self.documents.insert_one(doc)
        return str(result.inserted_id)
    
    def store_analysis(self, document_id: str, analysis_type: str, data: Dict) -> str:
        """Store analysis results (NLP, lab values, risks, etc.)"""
        doc = {
            "document_id": document_id,
            "analysis_type": analysis_type,
            "data": data,
            "created_at": datetime.utcnow()
        }
        result = self.analyses.insert_one(doc)
        return str(result.inserted_id)
    
    def store_image_analysis(self, user_id: str, filename: str, analysis: Dict) -> str:
        """Store medical image analysis results"""
        doc = {
            "user_id": user_id,
            "filename": filename,
            "analysis": analysis,
            "uploaded_at": datetime.utcnow()
        }
        result = self.images.insert_one(doc)
        return str(result.inserted_id)
    
    def get_document_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get document upload history for user"""
        docs = self.documents.find(
            {"user_id": user_id}
        ).sort("uploaded_at", -1).limit(limit)
        
        result = []
        for doc in docs:
            result.append({
                "document_id": str(doc["_id"]),
                "filename": doc["filename"],
                "summary_type": doc["summary_type"],
                "uploaded_at": doc["uploaded_at"].isoformat(),
                "stats": doc.get("stats", {})
            })
        return result
    
    def get_document_analyses(self, document_id: str) -> List[Dict]:
        """Get all analyses for a document"""
        analyses = self.analyses.find({"document_id": document_id})
        
        result = []
        for analysis in analyses:
            result.append({
                "analysis_id": str(analysis["_id"]),
                "analysis_type": analysis["analysis_type"],
                "data": analysis["data"],
                "created_at": analysis["created_at"].isoformat()
            })
        return result
    
    def get_image_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get image upload history for user"""
        images = self.images.find(
            {"user_id": user_id}
        ).sort("uploaded_at", -1).limit(limit)
        
        result = []
        for img in images:
            result.append({
                "image_id": str(img["_id"]),
                "filename": img["filename"],
                "uploaded_at": img["uploaded_at"].isoformat(),
                "analysis": img.get("analysis", {})
            })
        return result
    
    def search_documents(self, user_id: str, query: str, limit: int = 20) -> List[Dict]:
        """Search documents by text"""
        docs = self.documents.find(
            {
                "user_id": user_id,
                "$or": [
                    {"filename": {"$regex": query, "$options": "i"}},
                    {"summary": {"$regex": query, "$options": "i"}}
                ]
            }
        ).sort("uploaded_at", -1).limit(limit)
        
        result = []
        for doc in docs:
            result.append({
                "document_id": str(doc["_id"]),
                "filename": doc["filename"],
                "summary": doc["summary"][:200] + "...",
                "uploaded_at": doc["uploaded_at"].isoformat()
            })
        return result
    
    def get_stats(self, user_id: str) -> Dict:
        """Get user statistics"""
        doc_count = self.documents.count_documents({"user_id": user_id})
        img_count = self.images.count_documents({"user_id": user_id})
        
        return {
            "total_documents": doc_count,
            "total_images": img_count,
            "total_analyses": doc_count + img_count
        }
