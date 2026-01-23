"""
Medical Vision Analysis Module
Analyzes medical images (X-rays, CT, MRI, pathology, etc.) using Vision AI
"""

import base64
import os
import time
import json
import re
from typing import Dict, Any, List, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
import httpx

# Try to import PIL for image processing
try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL not installed. Image preprocessing will be limited.")

from .utils import log_event


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class ImageFinding:
    """Represents a finding in a medical image"""
    finding: str
    location: str
    severity: str  # NORMAL, MILD, MODERATE, SEVERE, CRITICAL
    confidence: float
    description: str

@dataclass
class ImageAnalysisResult:
    """Complete medical image analysis result"""
    image_type: str  # X-RAY, CT, MRI, ULTRASOUND, PATHOLOGY, etc.
    body_part: str
    modality: str
    findings: List[ImageFinding]
    impression: str
    recommendations: List[str]
    abnormalities_detected: bool
    confidence_score: float
    raw_analysis: str


# ============================================================================
# MEDICAL IMAGE PROMPTS
# ============================================================================

MEDICAL_IMAGE_PROMPT = """You are an expert radiologist and medical imaging specialist. Analyze this medical image carefully and provide a detailed clinical assessment.

Instructions:
1. Identify the type of medical image (X-ray, CT, MRI, Ultrasound, Pathology slide, etc.)
2. Identify the body part or organ being imaged
3. Describe all visible anatomical structures
4. Identify any abnormalities, lesions, or pathological findings
5. Note any artifacts or image quality issues
6. Provide severity assessment for any findings
7. Give clinical recommendations

IMPORTANT: This is for educational/informational purposes. Always recommend professional medical consultation.

Format your response as follows:

**IMAGE TYPE:** [Type of scan/image]
**BODY PART:** [Anatomical region]
**MODALITY:** [Imaging modality details]

**FINDINGS:**
1. [Finding 1] - Location: [location], Severity: [NORMAL/MILD/MODERATE/SEVERE]
2. [Finding 2] - Location: [location], Severity: [severity]
...

**IMPRESSION:**
[Overall clinical impression summary]

**RECOMMENDATIONS:**
1. [Recommendation 1]
2. [Recommendation 2]
...

**ABNORMALITIES DETECTED:** [YES/NO]
**CONFIDENCE:** [HIGH/MEDIUM/LOW]
"""


# ============================================================================
# IMAGE PROCESSING
# ============================================================================

def preprocess_image(image_path: str, max_size: int = 1024) -> bytes:
    """Preprocess image for API submission"""
    if PIL_AVAILABLE:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=90)
            return buffer.getvalue()
    else:
        # Just read the file directly
        with open(image_path, 'rb') as f:
            return f.read()


def encode_image_base64(image_data: bytes) -> str:
    """Encode image bytes to base64 string"""
    return base64.b64encode(image_data).decode('utf-8')


def get_image_info(image_path: str) -> Dict[str, Any]:
    """Get image metadata"""
    info = {
        "filename": os.path.basename(image_path),
        "size_bytes": os.path.getsize(image_path),
        "format": "unknown"
    }
    
    if PIL_AVAILABLE:
        try:
            with Image.open(image_path) as img:
                info["format"] = img.format
                info["width"] = img.size[0]
                info["height"] = img.size[1]
                info["mode"] = img.mode
        except Exception as e:
            print(f"Could not get image info: {e}")
    
    return info


# ============================================================================
# NVIDIA VISION API (Using Mixtral with vision capabilities)
# ============================================================================

class MedicalVisionAnalyzer:
    """Analyzes medical images using Vision AI"""
    
    def __init__(self, api_key: str = None):
        # Use NVIDIA API key or environment variable
        self.api_key = api_key or os.environ.get(
            "NVIDIA_API_KEY",
            "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"
        )
        self.base_url = "https://integrate.api.nvidia.com/v1"
        
    def analyze_image(self, image_path: str) -> ImageAnalysisResult:
        """
        Analyze a medical image and return findings
        """
        start_time = time.time()
        
        try:
            # Preprocess and encode image
            image_data = preprocess_image(image_path)
            image_base64 = encode_image_base64(image_data)
            image_info = get_image_info(image_path)
            
            # Try NVIDIA vision model first
            analysis_text = self._call_nvidia_vision(image_base64, image_info)
            
            # Parse the response
            result = self._parse_analysis(analysis_text)
            
            # Log the analysis
            processing_time = time.time() - start_time
            log_event("medical_image_analysis", {
                "image_type": result.image_type,
                "body_part": result.body_part,
                "abnormalities": result.abnormalities_detected,
                "findings_count": len(result.findings),
                "processing_time": processing_time
            })
            
            return result
            
        except Exception as e:
            print(f"Error analyzing image: {e}")
            # Return a basic result with error information
            return ImageAnalysisResult(
                image_type="Unknown",
                body_part="Unknown",
                modality="Unknown",
                findings=[],
                impression=f"Analysis could not be completed: {str(e)}",
                recommendations=["Please consult a healthcare professional for proper image interpretation."],
                abnormalities_detected=False,
                confidence_score=0.0,
                raw_analysis=""
            )
    
    def _call_nvidia_vision(self, image_base64: str, image_info: Dict) -> str:
        """Call NVIDIA API for vision analysis"""
        
        # NVIDIA's vision-capable model
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Use llama-3.2-90b-vision-instruct which supports vision
        payload = {
            "model": "meta/llama-3.2-90b-vision-instruct",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": MEDICAL_IMAGE_PROMPT
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
            "top_p": 0.9
        }
        
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    print(f"NVIDIA API error: {response.status_code} - {response.text}")
                    # Fall back to text-only analysis
                    return self._fallback_analysis(image_info)
                    
        except Exception as e:
            print(f"Vision API call failed: {e}")
            return self._fallback_analysis(image_info)
    
    def _fallback_analysis(self, image_info: Dict) -> str:
        """Fallback when vision API is unavailable"""
        return f"""**IMAGE TYPE:** Medical Image
**BODY PART:** Unable to determine from image
**MODALITY:** {image_info.get('format', 'Unknown')} format, {image_info.get('width', 'Unknown')}x{image_info.get('height', 'Unknown')} pixels

**FINDINGS:**
1. Image uploaded successfully - Severity: NOT ASSESSED
2. Automated analysis requires vision-enabled AI model - Severity: NOT ASSESSED

**IMPRESSION:**
The image has been received but detailed automated analysis is currently unavailable. 
The image appears to be a {image_info.get('format', 'medical')} format file of size {image_info.get('size_bytes', 0)} bytes.

**RECOMMENDATIONS:**
1. Please consult a qualified healthcare professional for proper image interpretation
2. Ensure the image is of sufficient quality for medical assessment
3. Provide clinical history and context for accurate interpretation

**ABNORMALITIES DETECTED:** UNABLE TO DETERMINE
**CONFIDENCE:** LOW
"""
    
    def _parse_analysis(self, text: str) -> ImageAnalysisResult:
        """Parse the AI response into structured data"""
        
        # Default values
        image_type = "Unknown"
        body_part = "Unknown"
        modality = "Unknown"
        findings = []
        impression = ""
        recommendations = []
        abnormalities = False
        confidence = 0.5
        
        try:
            # Extract image type
            match = re.search(r'\*\*IMAGE TYPE:\*\*\s*(.+?)(?:\n|$)', text)
            if match:
                image_type = match.group(1).strip()
            
            # Extract body part
            match = re.search(r'\*\*BODY PART:\*\*\s*(.+?)(?:\n|$)', text)
            if match:
                body_part = match.group(1).strip()
            
            # Extract modality
            match = re.search(r'\*\*MODALITY:\*\*\s*(.+?)(?:\n|$)', text)
            if match:
                modality = match.group(1).strip()
            
            # Extract findings
            findings_match = re.search(r'\*\*FINDINGS:\*\*\s*(.*?)(?:\*\*IMPRESSION|\*\*RECOMMENDATION|$)', text, re.DOTALL)
            if findings_match:
                findings_text = findings_match.group(1)
                # Parse individual findings
                finding_patterns = re.findall(r'\d+\.\s*(.+?)\s*-\s*Location:\s*([^,]+),?\s*Severity:\s*(\w+)', findings_text)
                for finding_text, location, severity in finding_patterns:
                    findings.append(ImageFinding(
                        finding=finding_text.strip(),
                        location=location.strip(),
                        severity=severity.upper().strip(),
                        confidence=0.8,
                        description=finding_text.strip()
                    ))
            
            # Extract impression
            match = re.search(r'\*\*IMPRESSION:\*\*\s*(.*?)(?:\*\*RECOMMENDATION|$)', text, re.DOTALL)
            if match:
                impression = match.group(1).strip()
            
            # Extract recommendations
            rec_match = re.search(r'\*\*RECOMMENDATIONS?:\*\*\s*(.*?)(?:\*\*ABNORMALITIES|\*\*CONFIDENCE|$)', text, re.DOTALL)
            if rec_match:
                rec_text = rec_match.group(1)
                recommendations = [r.strip() for r in re.findall(r'\d+\.\s*(.+?)(?:\n|$)', rec_text)]
            
            # Extract abnormalities
            match = re.search(r'\*\*ABNORMALITIES DETECTED:\*\*\s*(\w+)', text)
            if match:
                abnormalities = match.group(1).upper() in ['YES', 'TRUE']
            
            # Extract confidence
            match = re.search(r'\*\*CONFIDENCE:\*\*\s*(\w+)', text)
            if match:
                conf_text = match.group(1).upper()
                confidence = {'HIGH': 0.9, 'MEDIUM': 0.7, 'LOW': 0.4}.get(conf_text, 0.5)
                
        except Exception as e:
            print(f"Error parsing analysis: {e}")
        
        return ImageAnalysisResult(
            image_type=image_type,
            body_part=body_part,
            modality=modality,
            findings=findings,
            impression=impression,
            recommendations=recommendations,
            abnormalities_detected=abnormalities,
            confidence_score=confidence,
            raw_analysis=text
        )


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_analyzer_instance = None

def get_analyzer() -> MedicalVisionAnalyzer:
    """Get or create analyzer instance"""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = MedicalVisionAnalyzer()
    return _analyzer_instance


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def analyze_medical_image(image_path: str) -> Dict[str, Any]:
    """
    Main function to analyze a medical image
    Returns a dictionary with analysis results
    """
    analyzer = get_analyzer()
    result = analyzer.analyze_image(image_path)
    
    # Convert to dictionary
    return {
        "success": True,
        "image_type": result.image_type,
        "body_part": result.body_part,
        "modality": result.modality,
        "findings": [asdict(f) for f in result.findings],
        "impression": result.impression,
        "recommendations": result.recommendations,
        "abnormalities_detected": result.abnormalities_detected,
        "confidence_score": result.confidence_score,
        "raw_analysis": result.raw_analysis
    }


# For testing
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        result = analyze_medical_image(sys.argv[1])
        print(json.dumps(result, indent=2))
