"""
Lab Value Trend Analysis Module
Extract lab values from medical reports and track trends over time
"""

import re
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict, field
from .utils import log_event

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class LabValue:
    """Represents a single lab value measurement"""
    name: str
    value: float
    unit: str
    date: str
    reference_range: str = ""
    status: str = "normal"  # normal, low, high, critical
    source_file: str = ""

@dataclass
class LabTrendData:
    """Collection of lab values for trend analysis"""
    patient_name: str = ""
    values: List[LabValue] = field(default_factory=list)
    last_updated: str = ""


# ============================================================================
# LAB VALUE PATTERNS
# ============================================================================

# Regex patterns for common lab values
LAB_PATTERNS = {
    "HbA1c": {
        "patterns": [
            r"hba1c[:\s]*(\d+\.?\d*)\s*%",
            r"glycosylated\s+h[ae]moglobin[:\s]*(\d+\.?\d*)\s*%",
            r"glycated\s+h[ae]moglobin[:\s]*(\d+\.?\d*)\s*%",
            r"a1c[:\s]*(\d+\.?\d*)\s*%",
        ],
        "unit": "%",
        "reference": "4.0 - 5.6%",
        "ranges": {"low": 4.0, "normal_high": 5.6, "prediabetic": 6.4, "diabetic": 6.5}
    },
    "Fasting Glucose": {
        "patterns": [
            r"fasting\s+(?:blood\s+)?glucose[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"fbg[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"fbs[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"fasting\s+sugar[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "70 - 100 mg/dL",
        "ranges": {"low": 70, "normal_high": 100, "prediabetic": 125, "diabetic": 126}
    },
    "Random Glucose": {
        "patterns": [
            r"random\s+(?:blood\s+)?glucose[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"rbs[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"blood\s+sugar[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "< 140 mg/dL",
        "ranges": {"normal_high": 140, "diabetic": 200}
    },
    "Systolic BP": {
        "patterns": [
            r"(?:systolic|sys)[:\s]*(\d+)\s*(?:mmhg|mm\s*hg)?",
            r"bp[:\s]*(\d+)\s*/\s*\d+",
            r"blood\s+pressure[:\s]*(\d+)\s*/\s*\d+",
        ],
        "unit": "mmHg",
        "reference": "< 120 mmHg",
        "ranges": {"normal_high": 120, "elevated": 129, "high_stage1": 139, "high_stage2": 140}
    },
    "Diastolic BP": {
        "patterns": [
            r"(?:diastolic|dia)[:\s]*(\d+)\s*(?:mmhg|mm\s*hg)?",
            r"bp[:\s]*\d+\s*/\s*(\d+)",
            r"blood\s+pressure[:\s]*\d+\s*/\s*(\d+)",
        ],
        "unit": "mmHg",
        "reference": "< 80 mmHg",
        "ranges": {"normal_high": 80, "elevated": 89, "high_stage1": 89, "high_stage2": 90}
    },
    "Total Cholesterol": {
        "patterns": [
            r"total\s+cholesterol[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"cholesterol[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"tc[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "< 200 mg/dL",
        "ranges": {"normal_high": 200, "borderline": 239, "high": 240}
    },
    "HDL Cholesterol": {
        "patterns": [
            r"hdl[:\s-]*(?:cholesterol)?[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"high\s+density\s+lipoprotein[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "> 40 mg/dL",
        "ranges": {"low": 40, "normal_high": 60}
    },
    "LDL Cholesterol": {
        "patterns": [
            r"ldl[:\s-]*(?:cholesterol)?[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"low\s+density\s+lipoprotein[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "< 100 mg/dL",
        "ranges": {"optimal": 100, "near_optimal": 129, "borderline": 159, "high": 189}
    },
    "Triglycerides": {
        "patterns": [
            r"triglycerides?[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"tg[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "< 150 mg/dL",
        "ranges": {"normal_high": 150, "borderline": 199, "high": 499}
    },
    "Creatinine": {
        "patterns": [
            r"creatinine[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"serum\s+creatinine[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "0.7 - 1.3 mg/dL",
        "ranges": {"low": 0.7, "normal_high": 1.3, "elevated": 1.5}
    },
    "Hemoglobin": {
        "patterns": [
            r"h[ae]moglobin[:\s]*(\d+\.?\d*)\s*(?:g/dl|gm/dl|g%)",
            r"hb[:\s]*(\d+\.?\d*)\s*(?:g/dl|gm/dl|g%)",
            r"hgb[:\s]*(\d+\.?\d*)\s*(?:g/dl|gm/dl|g%)",
        ],
        "unit": "g/dL",
        "reference": "12.0 - 17.5 g/dL",
        "ranges": {"low_critical": 7, "low": 12, "normal_high": 17.5, "high": 20}
    },
    "eAG": {
        "patterns": [
            r"e(?:stimated\s+)?a(?:verage\s+)?g(?:lucose)?[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
            r"mean\s+(?:blood\s+)?glucose[:\s]*(\d+\.?\d*)\s*(?:mg/dl|mg%)",
        ],
        "unit": "mg/dL",
        "reference": "< 154 mg/dL",
        "ranges": {"normal_high": 154, "prediabetic": 183, "diabetic": 184}
    },
}


# ============================================================================
# DATE EXTRACTION PATTERNS
# ============================================================================

DATE_PATTERNS = [
    r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})",  # DD-MM-YYYY or DD/MM/YYYY
    r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})",  # YYYY-MM-DD
    r"(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})",  # 14 Dec 2025
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})",  # Dec 14, 2025
]

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}


# ============================================================================
# LAB TREND ANALYZER
# ============================================================================

class LabTrendAnalyzer:
    """Analyze and track lab value trends over time"""
    
    def __init__(self, storage_path: str = "data/lab_trends.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load_data()
    
    def _load_data(self) -> LabTrendData:
        """Load existing trend data from file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                    values = [LabValue(**v) for v in data.get('values', [])]
                    return LabTrendData(
                        patient_name=data.get('patient_name', ''),
                        values=values,
                        last_updated=data.get('last_updated', '')
                    )
            except Exception as e:
                print(f"Error loading lab trends: {e}")
        return LabTrendData()
    
    def _save_data(self):
        """Save trend data to file"""
        try:
            data = {
                'patient_name': self.data.patient_name,
                'values': [asdict(v) for v in self.data.values],
                'last_updated': datetime.now().isoformat()
            }
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving lab trends: {e}")
    
    def extract_date(self, text: str) -> str:
        """Extract date from text"""
        text_lower = text.lower()
        
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, text_lower)
            if match:
                groups = match.groups()
                try:
                    if len(groups) == 3:
                        # Check if it's a month name pattern
                        if any(g in MONTH_MAP for g in groups):
                            # Handle "14 Dec 2025" or "Dec 14, 2025"
                            if groups[0] in MONTH_MAP:
                                month = MONTH_MAP[groups[0]]
                                day = int(groups[1])
                                year = int(groups[2])
                            else:
                                day = int(groups[0])
                                month = MONTH_MAP[groups[1][:3]]
                                year = int(groups[2])
                        elif int(groups[0]) > 31:  # YYYY-MM-DD
                            year = int(groups[0])
                            month = int(groups[1])
                            day = int(groups[2])
                        else:  # DD-MM-YYYY
                            day = int(groups[0])
                            month = int(groups[1])
                            year = int(groups[2])
                        
                        return f"{year:04d}-{month:02d}-{day:02d}"
                except:
                    continue
        
        # Return today's date if no date found
        return datetime.now().strftime("%Y-%m-%d")
    
    def extract_lab_values(self, text: str, source_file: str = "") -> List[LabValue]:
        """Extract all lab values from text"""
        text_lower = text.lower()
        extracted = []
        date = self.extract_date(text)
        
        for lab_name, config in LAB_PATTERNS.items():
            for pattern in config['patterns']:
                match = re.search(pattern, text_lower)
                if match:
                    try:
                        value = float(match.group(1))
                        
                        # Determine status based on ranges
                        status = self._determine_status(value, config.get('ranges', {}), lab_name)
                        
                        lab_value = LabValue(
                            name=lab_name,
                            value=value,
                            unit=config['unit'],
                            date=date,
                            reference_range=config['reference'],
                            status=status,
                            source_file=source_file
                        )
                        extracted.append(lab_value)
                        break  # Found a match, move to next lab type
                    except ValueError:
                        continue
        
        return extracted
    
    def _determine_status(self, value: float, ranges: Dict, lab_name: str) -> str:
        """Determine if value is normal, low, high, or critical"""
        if not ranges:
            return "normal"
        
        # Special handling for different lab types
        if "Glucose" in lab_name or lab_name == "HbA1c" or lab_name == "eAG":
            if "diabetic" in ranges and value >= ranges["diabetic"]:
                return "high"
            elif "prediabetic" in ranges and value >= ranges["prediabetic"]:
                return "elevated"
            elif "normal_high" in ranges and value > ranges["normal_high"]:
                return "elevated"
            elif "low" in ranges and value < ranges["low"]:
                return "low"
            return "normal"
        
        elif "BP" in lab_name:
            if "high_stage2" in ranges and value >= ranges["high_stage2"]:
                return "high"
            elif "high_stage1" in ranges and value >= ranges["high_stage1"]:
                return "elevated"
            elif "normal_high" in ranges and value > ranges["normal_high"]:
                return "elevated"
            return "normal"
        
        elif "Cholesterol" in lab_name or "Triglycerides" in lab_name:
            if "high" in ranges and value >= ranges["high"]:
                return "high"
            elif "borderline" in ranges and value >= ranges["borderline"]:
                return "elevated"
            elif "normal_high" in ranges and value > ranges["normal_high"]:
                return "elevated"
            elif "low" in ranges and value < ranges["low"]:
                return "low"
            return "normal"
        
        else:
            # Generic handling
            if "low_critical" in ranges and value < ranges["low_critical"]:
                return "critical"
            elif "low" in ranges and value < ranges["low"]:
                return "low"
            elif "high" in ranges and value >= ranges["high"]:
                return "high"
            elif "elevated" in ranges and value >= ranges["elevated"]:
                return "elevated"
            elif "normal_high" in ranges and value > ranges["normal_high"]:
                return "elevated"
            return "normal"
    
    def add_report(self, text: str, source_file: str = "") -> Dict[str, Any]:
        """Add lab values from a new report"""
        extracted = self.extract_lab_values(text, source_file)
        
        if extracted:
            self.data.values.extend(extracted)
            self.data.last_updated = datetime.now().isoformat()
            self._save_data()
            
            log_event("lab_values_extracted", {
                "count": len(extracted),
                "labs": [v.name for v in extracted]
            })
        
        return {
            "success": True,
            "extracted_count": len(extracted),
            "values": [asdict(v) for v in extracted]
        }
    
    def get_trends(self, lab_name: Optional[str] = None) -> Dict[str, Any]:
        """Get trend data for visualization"""
        values = self.data.values
        
        if lab_name:
            values = [v for v in values if v.name == lab_name]
        
        # Group by lab name
        grouped = {}
        for v in values:
            if v.name not in grouped:
                grouped[v.name] = []
            grouped[v.name].append(asdict(v))
        
        # Sort each group by date
        for name in grouped:
            grouped[name].sort(key=lambda x: x['date'])
        
        # Get all unique lab names
        available_labs = list(set(v.name for v in self.data.values))
        
        return {
            "success": True,
            "trends": grouped,
            "available_labs": available_labs,
            "total_measurements": len(self.data.values)
        }
    
    def get_latest_values(self) -> Dict[str, Any]:
        """Get the most recent value for each lab type"""
        latest = {}
        for v in sorted(self.data.values, key=lambda x: x.date, reverse=True):
            if v.name not in latest:
                latest[v.name] = asdict(v)
        
        return {
            "success": True,
            "latest": latest
        }
    
    def clear_data(self):
        """Clear all stored trend data"""
        self.data = LabTrendData()
        self._save_data()
        return {"success": True, "message": "Lab trend data cleared"}


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_analyzer_instance = None

def get_analyzer() -> LabTrendAnalyzer:
    """Get or create analyzer instance"""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = LabTrendAnalyzer()
    return _analyzer_instance


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def extract_and_store_lab_values(text: str, source_file: str = "") -> Dict[str, Any]:
    """Extract lab values from text and store for trending"""
    analyzer = get_analyzer()
    return analyzer.add_report(text, source_file)


def get_lab_trends(lab_name: Optional[str] = None) -> Dict[str, Any]:
    """Get lab value trends"""
    analyzer = get_analyzer()
    return analyzer.get_trends(lab_name)


def get_latest_lab_values() -> Dict[str, Any]:
    """Get latest lab values"""
    analyzer = get_analyzer()
    return analyzer.get_latest_values()


def clear_lab_trends() -> Dict[str, Any]:
    """Clear all lab trend data"""
    analyzer = get_analyzer()
    return analyzer.clear_data()
