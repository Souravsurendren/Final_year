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

TRANSLATION_SYSTEM_PROMPT = """You are an expert medical translator specializing in {language}.

Translate the following medical summary into {language} preserving:
1. All medical terminology accurately in the target language
2. Professional and empathetic tone
3. Numerical values, units (mg, mmHg, etc), and dates exactly as-is
4. Section numbers and structure (1. Patient Demographics, 2. etc)
5. All HTML formatting tags (<b>, <i>, <br>, etc) unchanged
6. Original paragraph breaks and line structure

For terms specific to {language} medical practice, use standard terminology.
For international drug/disease names without direct translation, keep the English term in parentheses.

Translate ONLY the text content, keep all HTML tags and structure identical.

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
        """Translate text to target language with proper encoding"""
        if target_lang_code not in SUPPORTED_LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported language: {target_lang_code}"
            }
            
        target_language = SUPPORTED_LANGUAGES[target_lang_code]
        
        try:
            # Ensure text is properly encoded UTF-8
            if isinstance(text, bytes):
                text = text.decode('utf-8', errors='replace')
            
            prompt = TRANSLATION_SYSTEM_PROMPT.format(
                language=target_language,
                text=text
            )
            
            response = self.llm.invoke([{"role": "user", "content": prompt}])
            translated_text = response.content
            
            # Ensure output is UTF-8 encoded
            if isinstance(translated_text, bytes):
                translated_text = translated_text.decode('utf-8', errors='replace')
            
            return {
                "success": True,
                "language": target_language,
                "language_code": target_lang_code,
                "translated_text": translated_text,
                "original_text_length": len(text),
                "translated_text_length": len(translated_text)
            }
            
        except Exception as e:
            print(f"Translation error: {e}")
            import traceback
            traceback.print_exc()
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
