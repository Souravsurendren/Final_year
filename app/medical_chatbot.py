"""
Medical Chatbot Module
RAG-based question answering for medical documents
Allows users to ask natural language questions about uploaded reports
"""

import time
import json
from typing import Dict, Any, List, Optional
from pathlib import Path
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from .utils import log_event

# ============================================================================
# CHATBOT SYSTEM PROMPT
# ============================================================================

CHATBOT_SYSTEM_PROMPT = """You are MedRAG Assistant, an intelligent medical document analysis chatbot.

Your role is to answer questions about medical documents that have been analyzed. You have access to:
1. The document summary
2. Medical entities extracted (diseases, medications, procedures, etc.)
3. ICD-10 codes identified
4. Drug interactions detected
5. Sentiment analysis of clinical findings

Instructions:
1. Answer questions ONLY based on the provided document context
2. Be precise and cite specific values, findings, or sections when available
3. If information is not available in the context, clearly state that
4. Use medical terminology appropriately but explain for patient understanding
5. For drug interactions or critical findings, emphasize their importance
6. Always recommend consulting a healthcare professional for medical decisions
7. Be conversational but professional

Document Context:
{context}

Remember: You can only answer based on the document provided above. Do not make up information.
"""

# ============================================================================
# QUICK RESPONSE PATTERNS
# ============================================================================

QUICK_RESPONSES = {
    # HbA1c related
    r"hba1c|glycated|glycosylated|a1c": {
        "search_keys": ["hba1c", "HbA1c", "glycated", "hemoglobin"],
        "template": "The HbA1c level is {value}."
    },
    # Blood glucose
    r"glucose|blood sugar|sugar level": {
        "search_keys": ["glucose", "sugar", "fasting", "postprandial"],
        "template": "Blood glucose information: {value}"
    },
    # Medications
    r"medication|medicine|drug|prescription|prescribed": {
        "search_keys": ["medication", "drug", "prescribed", "treatment"],
        "template": "Medications mentioned: {value}"
    },
    # Diagnosis
    r"diagnosis|condition|disease|disorder": {
        "search_keys": ["diagnosis", "diagnosed", "condition", "disease"],
        "template": "Diagnosis: {value}"
    },
}


# ============================================================================
# CHATBOT CLASS
# ============================================================================

class MedicalChatbot:
    """Medical RAG-based chatbot for document Q&A"""
    
    def __init__(self):
        self.nvidia_client = ChatNVIDIA(
            model="mistralai/mixtral-8x22b-instruct-v0.1",
            api_key="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",
            temperature=0.3,
            top_p=0.9,
            max_tokens=1024,
        )
        self.conversation_history: List[Dict] = []
        self.document_context: Optional[str] = None
        self.nlp_data: Optional[Dict] = None
    
    def set_context(self, summary: str, nlp_analysis: Dict = None):
        """Set the document context for the chatbot"""
        self.document_context = summary
        self.nlp_data = nlp_analysis
        self.conversation_history = []  # Reset conversation for new document
        
        # Build comprehensive context
        context_parts = [f"**Document Summary:**\n{summary}"]
        
        if nlp_analysis:
            # Add entities
            if nlp_analysis.get("entities"):
                entities = nlp_analysis["entities"]
                if entities.get("summary"):
                    context_parts.append(f"\n**Medical Entities Extracted:**")
                    for category, items in entities["summary"].items():
                        if items:
                            context_parts.append(f"- {category}: {', '.join(items[:10])}")
            
            # Add ICD-10 codes
            if nlp_analysis.get("icd10_codes"):
                codes = nlp_analysis["icd10_codes"].get("items", [])
                if codes:
                    context_parts.append(f"\n**ICD-10 Codes:**")
                    for code in codes[:5]:
                        context_parts.append(f"- {code['code']}: {code['description']}")
            
            # Add drug interactions
            if nlp_analysis.get("drug_interactions"):
                interactions = nlp_analysis["drug_interactions"].get("items", [])
                if interactions:
                    context_parts.append(f"\n**Drug Interactions Detected:**")
                    for inter in interactions:
                        context_parts.append(f"- {inter['drug1']} + {inter['drug2']}: {inter['severity']} - {inter['description']}")
            
            # Add sentiment
            if nlp_analysis.get("sentiment_analysis"):
                sentiment = nlp_analysis["sentiment_analysis"].get("overall", {})
                context_parts.append(f"\n**Clinical Sentiment:** {sentiment.get('label', 'N/A')} (Confidence: {sentiment.get('confidence', 0):.0%})")
        
        self.document_context = "\n".join(context_parts)
    
    def chat(self, user_message: str) -> Dict[str, Any]:
        """
        Process a user message and return AI response
        """
        start_time = time.time()
        
        if not self.document_context:
            return {
                "success": False,
                "response": "No document has been analyzed yet. Please upload and analyze a medical document first.",
                "error": "no_context"
            }
        
        try:
            # Check for quick responses first
            quick_response = self._try_quick_response(user_message)
            if quick_response:
                return {
                    "success": True,
                    "response": quick_response,
                    "source": "quick_lookup",
                    "processing_time": time.time() - start_time
                }
            
            # Build messages for LLM
            system_prompt = CHATBOT_SYSTEM_PROMPT.format(context=self.document_context)
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history (last 6 exchanges)
            for msg in self.conversation_history[-6:]:
                messages.append(msg)
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Call LLM
            response = self.nvidia_client.invoke(messages)
            ai_response = response.content
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": user_message})
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            
            # Log the interaction
            log_event("chatbot_interaction", {
                "question_length": len(user_message),
                "response_length": len(ai_response),
                "processing_time": time.time() - start_time
            })
            
            return {
                "success": True,
                "response": ai_response,
                "source": "llm",
                "processing_time": time.time() - start_time
            }
            
        except Exception as e:
            print(f"Chatbot error: {e}")
            return {
                "success": False,
                "response": f"I encountered an error processing your question. Please try again.",
                "error": str(e)
            }
    
    def _try_quick_response(self, query: str) -> Optional[str]:
        """Try to provide a quick response without LLM for simple queries"""
        query_lower = query.lower()
        
        # Look for HbA1c specifically
        if "hba1c" in query_lower or "a1c" in query_lower:
            if self.nlp_data and self.document_context:
                # Search in context for HbA1c value
                import re
                patterns = [
                    r'hba1c[:\s]+(\d+\.?\d*)\s*%',
                    r'(\d+\.?\d*)\s*%.*hba1c',
                    r'hba1c.*?(\d+\.?\d*)\s*%',
                    r'glycosylated.*?(\d+\.?\d*)\s*%'
                ]
                for pattern in patterns:
                    match = re.search(pattern, self.document_context.lower())
                    if match:
                        value = match.group(1)
                        return f"Based on the document, the HbA1c level is **{value}%**. This indicates the average blood sugar control over the past 2-3 months."
        
        # Look for patient name
        if "patient name" in query_lower or "who is the patient" in query_lower:
            import re
            patterns = [
                r'(?:mrs?\.?|miss)\s+([a-zA-Z]+)',
                r'patient[:\s]+([a-zA-Z]+)',
                r'name[:\s]+([a-zA-Z]+)'
            ]
            for pattern in patterns:
                match = re.search(pattern, self.document_context, re.IGNORECASE)
                if match:
                    return f"The patient's name is **{match.group(1)}**."
        
        return None
    
    def get_suggested_questions(self) -> List[str]:
        """Return suggested questions based on available data"""
        suggestions = [
            "What is the patient's diagnosis?",
            "What are the key findings in this report?",
            "Are there any concerning results?",
            "What medications are mentioned?",
            "What are the recommendations for follow-up?"
        ]
        
        if self.nlp_data:
            # Add specific suggestions based on available data
            if self.nlp_data.get("drug_interactions", {}).get("items"):
                suggestions.insert(0, "Are there any drug interactions I should know about?")
            
            if self.nlp_data.get("icd10_codes", {}).get("items"):
                suggestions.append("What ICD-10 codes are relevant to this case?")
            
            # Check for HbA1c in context
            if self.document_context and "hba1c" in self.document_context.lower():
                suggestions.insert(0, "What is the patient's HbA1c level?")
        
        return suggestions[:6]  # Return top 6 suggestions
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_chatbot_instance = None

def get_chatbot() -> MedicalChatbot:
    """Get or create chatbot instance"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = MedicalChatbot()
    return _chatbot_instance


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def set_chatbot_context(summary: str, nlp_analysis: Dict = None):
    """Set the document context for the chatbot"""
    chatbot = get_chatbot()
    chatbot.set_context(summary, nlp_analysis)


def chat_with_document(message: str) -> Dict[str, Any]:
    """Send a message to the chatbot"""
    chatbot = get_chatbot()
    return chatbot.chat(message)


def get_suggested_questions() -> List[str]:
    """Get suggested questions"""
    chatbot = get_chatbot()
    return chatbot.get_suggested_questions()


def clear_chat_history():
    """Clear conversation history"""
    chatbot = get_chatbot()
    chatbot.clear_history()
