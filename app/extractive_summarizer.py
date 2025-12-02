"""
Extractive Summarization Module
Implements extractive summarization by selecting the most important sentences from medical documents
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re
from typing import List, Dict, Tuple
from pathlib import Path
from .utils import log_event, write_json
import time

class ExtractiveSummarizer:
    def __init__(self):
        # Load sentence transformer for semantic similarity
        self.sentence_model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
        
        # Medical keywords that indicate importance
        self.medical_keywords = {
            'diagnosis': ['diagnosis', 'diagnosed', 'condition', 'disease', 'disorder', 'syndrome'],
            'symptoms': ['symptom', 'symptoms', 'complaint', 'presents', 'presenting', 'pain', 'fever'],
            'treatment': ['treatment', 'therapy', 'medication', 'prescription', 'administered', 'given'],
            'findings': ['findings', 'results', 'shows', 'reveals', 'indicates', 'suggests'],
            'tests': ['test', 'examination', 'scan', 'x-ray', 'mri', 'ct', 'ultrasound', 'blood'],
            'recommendations': ['recommend', 'advised', 'follow-up', 'discharge', 'continue'],
            'vital_signs': ['blood pressure', 'temperature', 'pulse', 'heart rate', 'bp', 'hr']
        }
        
    def preprocess_text(self, text: str) -> List[str]:
        """Split text into sentences and clean them"""
        # Split into sentences using multiple delimiters
        sentences = re.split(r'[.!?]+', text)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            # Filter out very short sentences or headers
            if len(sentence) > 20 and not sentence.isupper():
                # Remove extra whitespace
                sentence = re.sub(r'\s+', ' ', sentence)
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def calculate_medical_importance_score(self, sentence: str) -> float:
        """Calculate importance score based on medical keywords"""
        sentence_lower = sentence.lower()
        score = 0.0
        
        for category, keywords in self.medical_keywords.items():
            for keyword in keywords:
                if keyword in sentence_lower:
                    # Weight different categories differently
                    if category in ['diagnosis', 'treatment']:
                        score += 2.0
                    elif category in ['findings', 'symptoms']:
                        score += 1.5
                    elif category in ['tests', 'recommendations']:
                        score += 1.0
                    else:
                        score += 0.5
        
        return score
    
    def calculate_tfidf_scores(self, sentences: List[str]) -> np.ndarray:
        """Calculate TF-IDF scores for sentences"""
        if len(sentences) < 2:
            return np.array([1.0] * len(sentences))
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            ngram_range=(1, 2)
        )
        
        try:
            # Fit and transform sentences
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Calculate average TF-IDF score for each sentence
            tfidf_scores = np.array(tfidf_matrix.sum(axis=1)).flatten()
            
            # Normalize scores
            if tfidf_scores.max() > 0:
                tfidf_scores = tfidf_scores / tfidf_scores.max()
            
            return tfidf_scores
            
        except Exception as e:
            print(f"Warning: TF-IDF calculation failed: {e}")
            return np.array([1.0] * len(sentences))
    
    def calculate_semantic_centrality(self, sentences: List[str]) -> np.ndarray:
        """Calculate semantic centrality scores using sentence embeddings"""
        if len(sentences) < 2:
            return np.array([1.0] * len(sentences))
        
        try:
            # Get sentence embeddings
            embeddings = self.sentence_model.encode(sentences)
            
            # Calculate cosine similarity matrix
            similarity_matrix = cosine_similarity(embeddings)
            
            # Calculate centrality scores (average similarity to all other sentences)
            centrality_scores = np.mean(similarity_matrix, axis=1)
            
            # Normalize scores
            if centrality_scores.max() > 0:
                centrality_scores = centrality_scores / centrality_scores.max()
            
            return centrality_scores
            
        except Exception as e:
            print(f"Warning: Semantic centrality calculation failed: {e}")
            return np.array([1.0] * len(sentences))
    
    def calculate_position_scores(self, sentences: List[str]) -> np.ndarray:
        """Calculate position-based scores (first and last sentences often important)"""
        n = len(sentences)
        if n == 0:
            return np.array([])
        if n == 1:
            return np.array([1.0])
        
        scores = np.zeros(n)
        
        # Higher scores for beginning and end sentences
        for i in range(n):
            if i < n * 0.3:  # First 30%
                scores[i] = 1.0 - (i / (n * 0.3)) * 0.3
            elif i > n * 0.7:  # Last 30%
                scores[i] = 0.7 + ((i - n * 0.7) / (n * 0.3)) * 0.3
            else:  # Middle 40%
                scores[i] = 0.5
        
        return scores
    
    def extract_key_sentences(self, chunks: List[Dict], num_sentences: int = 10) -> List[Dict]:
        """Extract the most important sentences from chunks using multiple scoring methods"""
        
        # Combine all text from chunks
        all_text = "\n\n".join([chunk['text'] for chunk in chunks])
        
        # Split into sentences
        sentences = self.preprocess_text(all_text)
        
        if len(sentences) == 0:
            return []
        
        # Calculate different types of scores
        medical_scores = np.array([self.calculate_medical_importance_score(s) for s in sentences])
        tfidf_scores = self.calculate_tfidf_scores(sentences)
        centrality_scores = self.calculate_semantic_centrality(sentences)
        position_scores = self.calculate_position_scores(sentences)
        
        # Combine scores with weights
        combined_scores = (
            0.4 * medical_scores / (medical_scores.max() + 1e-10) +
            0.25 * tfidf_scores +
            0.25 * centrality_scores +
            0.1 * position_scores
        )
        
        # Get top sentences
        top_indices = np.argsort(combined_scores)[::-1][:num_sentences]
        
        # Sort by original order to maintain document flow
        top_indices = sorted(top_indices)
        
        # Create result with sentence information
        extracted_sentences = []
        for idx in top_indices:
            extracted_sentences.append({
                'sentence': sentences[idx],
                'score': float(combined_scores[idx]),
                'medical_score': float(medical_scores[idx]),
                'tfidf_score': float(tfidf_scores[idx]),
                'centrality_score': float(centrality_scores[idx]),
                'position_score': float(position_scores[idx]),
                'order': int(idx)
            })
        
        return extracted_sentences
    
    def format_extractive_summary(self, extracted_sentences: List[Dict]) -> str:
        """Format extracted sentences into a readable summary"""
        
        if not extracted_sentences:
            return "No significant sentences could be extracted from the document."
        
        # Group sentences by their medical importance
        high_importance = [s for s in extracted_sentences if s['medical_score'] >= 2.0]
        medium_importance = [s for s in extracted_sentences if 1.0 <= s['medical_score'] < 2.0]
        low_importance = [s for s in extracted_sentences if s['medical_score'] < 1.0]
        
        summary_parts = []
        
        if high_importance:
            summary_parts.append("**Key Medical Information:**")
            for i, sent in enumerate(high_importance, 1):
                summary_parts.append(f"{i}. {sent['sentence'].strip()}")
            summary_parts.append("")
        
        if medium_importance:
            summary_parts.append("**Clinical Findings & Details:**")
            for i, sent in enumerate(medium_importance, 1):
                summary_parts.append(f"{i}. {sent['sentence'].strip()}")
            summary_parts.append("")
        
        if low_importance:
            summary_parts.append("**Additional Information:**")
            for i, sent in enumerate(low_importance, 1):
                summary_parts.append(f"{i}. {sent['sentence'].strip()}")
            summary_parts.append("")
        
        # Add metadata
        summary_parts.append("---")
        summary_parts.append(f"**Summary Type:** Extractive")
        summary_parts.append(f"**Sentences Extracted:** {len(extracted_sentences)}")
        summary_parts.append(f"**High Priority:** {len(high_importance)} sentences")
        summary_parts.append(f"**Medium Priority:** {len(medium_importance)} sentences")
        summary_parts.append(f"**Low Priority:** {len(low_importance)} sentences")
        
        return "\n".join(summary_parts)

def extractive_summarize(chunks: List[Dict], num_sentences: int = 10) -> str:
    """
    Main function to perform extractive summarization on medical document chunks
    
    Args:
        chunks: List of chunk dictionaries with 'text' field
        num_sentences: Number of sentences to extract (default: 10)
    
    Returns:
        Formatted extractive summary string
    """
    start_time = time.time()
    
    try:
        # Initialize summarizer
        summarizer = ExtractiveSummarizer()
        
        # Extract key sentences
        extracted_sentences = summarizer.extract_key_sentences(chunks, num_sentences)
        
        # Format summary
        summary = summarizer.format_extractive_summary(extracted_sentences)
        
        # Log the operation
        processing_time = time.time() - start_time
        log_event("extractive_summarization", {
            "num_chunks": len(chunks),
            "num_sentences_extracted": len(extracted_sentences),
            "processing_time": processing_time
        })
        
        # Save detailed results for analysis
        detailed_results = {
            "summary": summary,
            "extracted_sentences": extracted_sentences,
            "processing_time": processing_time,
            "num_input_chunks": len(chunks),
            "timestamp": time.time()
        }
        
        write_json(Path("logs") / f"extractive_{int(time.time())}.json", detailed_results)
        
        return summary
        
    except Exception as e:
        error_msg = f"Error in extractive summarization: {str(e)}"
        print(error_msg)
        log_event("extractive_summarization_error", {"error": error_msg})
        
        # Return a fallback summary
        return f"**Extractive Summary Generation Failed**\n\nError: {error_msg}\n\nPlease try again or use abstractive summarization."