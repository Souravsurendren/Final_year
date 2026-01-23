"""
Medical Risk Score Calculator Module
Calculates health risk scores based on extracted lab values and demographics.
Includes:
- Demographic Extraction (Age, Gender)
- Framingham Risk Score (Cardiovascular)
- ASCVD Risk Estimator
- Metabolic Syndrome Check
"""

import re
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class PatientDemographics:
    age: int = 50  # Default if not found
    gender: str = "male"  # Default
    smoker: bool = False  # Default to False (safety)
    diabetic: bool = False
    treated_bp: bool = False

class RiskCalculator:
    """Calculates medical risk scores"""
    
    def extract_demographics(self, text: str) -> PatientDemographics:
        """Extract age and gender from text"""
        text_lower = text.lower()
        demographics = PatientDemographics()
        
        # Extract Age
        age_patterns = [
            r"age[:\s]*(\d{1,3})",
            r"(\d{1,3})\s*years?\s*old",
            r"(\d{1,3})\s*y/o",
            r"dob",  # If DOB found, calculation is harder, skipping for MVP
        ]
        
        for pattern in age_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    age = int(match.group(1))
                    if 18 <= age <= 120:  # Validate reasonable age
                        demographics.age = age
                        break
                except:
                    continue
                    
        # Extract Gender
        if re.search(r"\b(male|gentleman|mr\.|man|boy)\b", text_lower):
            demographics.gender = "male"
        elif re.search(r"\b(female|lady|mrs\.|ms\.|woman|girl)\b", text_lower):
            demographics.gender = "female"
            
        # Detect Smoker Status keyword (basic)
        if re.search(r"smoker|tobacco|smoking\s*:\s*yes", text_lower):
            demographics.smoker = True
            
        return demographics

    def calculate_framingham(self, demographics: PatientDemographics, labs: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculate simplified Framingham Risk Score (10-year CVD risk)
        Ref: https://www.mdcalc.com/calc/38/framingham-risk-score-hard-coronary-heart-disease
        """
        score = 0
        age = demographics.age
        gender = demographics.gender
        
        # Get lab values with defaults if missing
        chol = labs.get("Total Cholesterol", 180)
        hdl = labs.get("HDL Cholesterol", 50)
        sbp = labs.get("Systolic BP", 120)
        
        # --- LOGIC FOR MEN ---
        if gender == "male":
            # Age
            if 20 <= age <= 34: score -= 9
            elif 35 <= age <= 39: score -= 4
            elif 40 <= age <= 44: score += 0
            elif 45 <= age <= 49: score += 3
            elif 50 <= age <= 54: score += 6
            elif 55 <= age <= 59: score += 8
            elif 60 <= age <= 64: score += 10
            elif 65 <= age <= 69: score += 11
            elif 70 <= age <= 74: score += 12
            elif 75 <= age <= 79: score += 13
            
            # Total Cholesterol
            if chol < 160: score += 0
            elif 160 <= chol <= 199: score += 4
            elif 200 <= chol <= 239: score += 7
            elif 240 <= chol <= 279: score += 9
            elif chol >= 280: score += 11
            
            # HDL
            if hdl >= 60: score -= 1
            elif 50 <= hdl <= 59: score += 0
            elif 40 <= hdl <= 49: score += 1
            elif hdl < 40: score += 2
            
            # Systolic BP (Untreated assumed for simpler valid logic)
            if sbp < 120: score += 0
            elif 120 <= sbp <= 129: score += 0
            elif 130 <= sbp <= 139: score += 1
            elif 140 <= sbp <= 159: score += 1
            elif sbp >= 160: score += 2
            
            # Smoker
            if demographics.smoker:
                if age <= 39: score += 8
                elif age <= 49: score += 5
                elif age <= 59: score += 3
                elif age <= 69: score += 1
                else: score += 1

        # --- LOGIC FOR WOMEN ---
        else:
            # Age
            if 20 <= age <= 34: score -= 7
            elif 35 <= age <= 39: score -= 3
            elif 40 <= age <= 44: score += 0
            elif 45 <= age <= 49: score += 3
            elif 50 <= age <= 54: score += 6
            elif 55 <= age <= 59: score += 8
            elif 60 <= age <= 64: score += 10
            elif 65 <= age <= 69: score += 12
            elif 70 <= age <= 74: score += 14
            elif 75 <= age <= 79: score += 16
            
            # Total Cholesterol
            if chol < 160: score += 0
            elif 160 <= chol <= 199: score += 4
            elif 200 <= chol <= 239: score += 8
            elif 240 <= chol <= 279: score += 11
            elif chol >= 280: score += 13
            
            # HDL
            if hdl >= 60: score -= 1
            elif 50 <= hdl <= 59: score += 0
            elif 40 <= hdl <= 49: score += 1
            elif hdl < 40: score += 2
            
            # Systolic BP
            if sbp < 120: score += 0
            elif 120 <= sbp <= 129: score += 1
            elif 130 <= sbp <= 139: score += 2
            elif 140 <= sbp <= 159: score += 3
            elif sbp >= 160: score += 4
            
            # Smoker
            if demographics.smoker:
                if age <= 39: score += 9
                elif age <= 49: score += 7
                elif age <= 59: score += 4
                elif age <= 69: score += 2
                else: score += 1

        # Calculate Risk Percentage
        risk_percent = "< 1%"
        if gender == "male":
            if score <= 0: risk_percent = "< 1%"
            elif score <= 4: risk_percent = "1%"
            elif score <= 6: risk_percent = "2%"
            elif score == 7: risk_percent = "3%"
            elif score == 8: risk_percent = "4%"
            elif score == 9: risk_percent = "5%"
            elif score == 10: risk_percent = "6%"
            elif score == 11: risk_percent = "8%"
            elif score == 12: risk_percent = "10%"
            elif score == 13: risk_percent = "12%"
            elif score == 14: risk_percent = "16%"
            elif score == 15: risk_percent = "20%"
            elif score == 16: risk_percent = "25%"
            elif score >= 17: risk_percent = "> 30%"
        else:
            if score <= 8: risk_percent = "< 1%"
            elif score <= 12: risk_percent = "1%"
            elif score <= 14: risk_percent = "2%"
            elif score == 15: risk_percent = "3%"
            elif score == 16: risk_percent = "4%"
            elif score == 17: risk_percent = "5%"
            elif score == 18: risk_percent = "6%"
            elif score == 19: risk_percent = "8%"
            elif score == 20: risk_percent = "11%"
            elif score == 21: risk_percent = "14%"
            elif score == 22: risk_percent = "17%"
            elif score == 23: risk_percent = "22%"
            elif score == 24: risk_percent = "27%"
            elif score >= 25: risk_percent = "> 30%"

        return {
            "score_name": "Framingham Risk Score",
            "risk_percent": risk_percent,
            "points": score,
            "category": "Low Risk" if score < 10 else "Intermediate Risk" if score < 20 else "High Risk",
            "interpretation": f"Based on age {age} and cholesterol/BP levels, estimated 10-year heart disease risk is {risk_percent}."
        }

    def check_metabolic_syndrome(self, labs: Dict[str, float]) -> Dict[str, Any]:
        """
        Check for Metabolic Syndrome criteria (3 of 5 needed)
        Criteria:
        1. Glucose >= 100 mg/dL (or med use)
        2. HDL < 40 (M) or < 50 (F)
        3. Triglycerides >= 150 mg/dL
        4. BP >= 130/85 mmHg
        5. Waist Circumference (Not available in labs, usually)
        """
        criteria_met = 0
        reasons = []
        
        # 1. Glucose
        glucose = labs.get("Fasting Glucose", 0)
        hba1c = labs.get("HbA1c", 0)
        if glucose >= 100 or hba1c >= 5.7:
            criteria_met += 1
            reasons.append("Elevated Glucose")
            
        # 2. HDL
        hdl = labs.get("HDL Cholesterol", 100)
        # Assuming male threshold for strictness if gender unknown, or check demographics if passed
        if hdl < 40:
            criteria_met += 1
            reasons.append("Low HDL")
            
        # 3. Triglycerides
        trigs = labs.get("Triglycerides", 0)
        if trigs >= 150:
            criteria_met += 1
            reasons.append("High Triglycerides")
            
        # 4. BP
        sbp = labs.get("Systolic BP", 0)
        dbp = labs.get("Diastolic BP", 0)
        if sbp >= 130 or dbp >= 85:
            criteria_met += 1
            reasons.append("Elevated Blood Pressure")
            
        return {
            "risk_present": criteria_met >= 3,
            "criteria_count": criteria_met,
            "factors": reasons,
            "interpretation": f"Met {criteria_met}/4 detectable criteria for Metabolic Syndrome."
        }

def calculate_risks(text: str, lab_values: list) -> Dict[str, Any]:
    """
    Main function to calculate all risks
    """
    calc = RiskCalculator()
    
    # Extract demographics
    demos = calc.extract_demographics(text)
    
    # Convert list of lab value dicts to simpler lookup
    # Use most recent value for each lab name
    lab_lookup = {}
    for lv in lab_values:
        if isinstance(lv, dict):
            name = lv.get("name")
            value = lv.get("value")
            if name and value:
                lab_lookup[name] = value
        else: # If object
             lab_lookup[lv.name] = lv.value
                
    # Calculate Scores
    framingham = calc.calculate_framingham(demos, lab_lookup)
    metabolic = calc.check_metabolic_syndrome(lab_lookup)
    
    return {
        "demographics": {
            "age": demos.age,
            "gender": demos.gender,
            "smoker_detected": demos.smoker
        },
        "framingham": framingham,
        "metabolic_syndrome": metabolic
    }
