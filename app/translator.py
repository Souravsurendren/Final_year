"""
Medical Translation Module
Translates medical summaries into various languages
Supported: Hindi, Tamil, Telugu, Kannada, Malayalam + Spanish, French, German
"""

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from typing import Dict, Any, Optional

# ============================================================================
# SUPPORTED LANGUAGES
# ============================================================================

SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "es": "Spanish",
    "fr": "French",
    "de": "German"
}

# ============================================================================
# TRANSLATION PROMPT
# ============================================================================

TRANSLATION_SYSTEM_PROMPT = """You are an expert medical translator. 
Translate the following medical summary into {language}.

Rules:
1. Maintain accurate medical terminology.
2. Ensure the tone remains professional and empathetic.
3. For medical terms that are common in English (like 'Diabetes', 'Hypertension'), you may keep the English term in parentheses if it aids clarity.
4. The output must be valid Markdown.

Summary to translate:
{text}
"""

class MedicalTranslator:
    """Medical text translator using LLM"""
    
    def __init__(self):
        self.llm = ChatNVIDIA(
            model="mistralai/mixtral-8x22b-instruct-v0.1",
            api_key="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",
            temperature=0.1,
            max_tokens=2048
        )
    
    def translate(self, text: str, target_lang_code: str) -> Dict[str, Any]:
        """Translate text to target language"""
        if target_lang_code not in SUPPORTED_LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported language: {target_lang_code}"
            }
            
        target_language = SUPPORTED_LANGUAGES[target_lang_code]
        
        try:
            prompt = TRANSLATION_SYSTEM_PROMPT.format(
                language=target_language,
                text=text
            )
            
            response = self.llm.invoke([{"role": "user", "content": prompt}])
            translated_text = response.content
            
            return {
                "success": True,
                "language": target_language,
                "language_code": target_lang_code,
                "translated_text": translated_text
            }
            
        except Exception as e:
            print(f"Translation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_translator_instance = None

def get_translator() -> MedicalTranslator:
    """Get or create translator instance"""
    global _translator_instance
    if _translator_instance is None:
        _translator_instance = MedicalTranslator()
    return _translator_instance

def translate_summary(text: str, target_lang: str) -> Dict[str, Any]:
    """Translate summary wrapper"""
    translator = get_translator()
    return translator.translate(text, target_lang)
