"""
Medical NLP Module
Comprehensive medical text analysis including:
- Named Entity Recognition (NER)
- ICD-10 Code Mapping
- Drug Interaction Detection
- Medical Abbreviation Expansion
- Sentiment Analysis
"""

import re
import json
from typing import List, Dict, Tuple, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
from collections import defaultdict
import time

# For NER and embeddings
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# For sentiment analysis
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

from .utils import log_event, write_json


# ============================================================================
# DATA CLASSES FOR STRUCTURED OUTPUT
# ============================================================================

@dataclass
class MedicalEntity:
    """Represents an extracted medical entity"""
    text: str
    entity_type: str  # DISEASE, DRUG, PROCEDURE, ANATOMY, SYMPTOM, LAB_TEST
    start: int
    end: int
    confidence: float
    normalized_name: Optional[str] = None

@dataclass
class ICD10Code:
    """Represents an ICD-10 code mapping"""
    code: str
    description: str
    category: str
    confidence: float
    source_text: str

@dataclass
class DrugInteraction:
    """Represents a potential drug interaction"""
    drug1: str
    drug2: str
    severity: str  # MAJOR, MODERATE, MINOR
    description: str
    recommendation: str

@dataclass
class AbbreviationExpansion:
    """Represents an expanded medical abbreviation"""
    abbreviation: str
    expansion: str
    context: str
    confidence: float

@dataclass
class SentimentResult:
    """Represents sentiment analysis result"""
    text: str
    sentiment: str  # POSITIVE, NEGATIVE, NEUTRAL
    confidence: float
    clinical_relevance: str


# ============================================================================
# MEDICAL ABBREVIATIONS DATABASE
# ============================================================================

MEDICAL_ABBREVIATIONS = {
    # Vital Signs
    "BP": "Blood Pressure",
    "HR": "Heart Rate",
    "RR": "Respiratory Rate",
    "SpO2": "Oxygen Saturation",
    "T": "Temperature",
    "PR": "Pulse Rate",
    "BMI": "Body Mass Index",
    
    # Common Medical Terms
    "Dx": "Diagnosis",
    "Rx": "Prescription/Treatment",
    "Tx": "Treatment",
    "Hx": "History",
    "Sx": "Symptoms",
    "Fx": "Fracture",
    "Px": "Prognosis",
    "Bx": "Biopsy",
    
    # Conditions & Diseases
    "HTN": "Hypertension",
    "DM": "Diabetes Mellitus",
    "T2DM": "Type 2 Diabetes Mellitus",
    "T1DM": "Type 1 Diabetes Mellitus",
    "CHF": "Congestive Heart Failure",
    "COPD": "Chronic Obstructive Pulmonary Disease",
    "CAD": "Coronary Artery Disease",
    "MI": "Myocardial Infarction",
    "CVA": "Cerebrovascular Accident (Stroke)",
    "TIA": "Transient Ischemic Attack",
    "DVT": "Deep Vein Thrombosis",
    "PE": "Pulmonary Embolism",
    "UTI": "Urinary Tract Infection",
    "GERD": "Gastroesophageal Reflux Disease",
    "CKD": "Chronic Kidney Disease",
    "AKI": "Acute Kidney Injury",
    "ARDS": "Acute Respiratory Distress Syndrome",
    "AFib": "Atrial Fibrillation",
    "PVD": "Peripheral Vascular Disease",
    "RA": "Rheumatoid Arthritis",
    "OA": "Osteoarthritis",
    "SLE": "Systemic Lupus Erythematosus",
    "MS": "Multiple Sclerosis",
    "PD": "Parkinson's Disease",
    "AD": "Alzheimer's Disease",
    "BPH": "Benign Prostatic Hyperplasia",
    "PCOS": "Polycystic Ovary Syndrome",
    "IBS": "Irritable Bowel Syndrome",
    "IBD": "Inflammatory Bowel Disease",
    "TB": "Tuberculosis",
    "HIV": "Human Immunodeficiency Virus",
    "AIDS": "Acquired Immunodeficiency Syndrome",
    "HBV": "Hepatitis B Virus",
    "HCV": "Hepatitis C Virus",
    
    # Lab Tests
    "CBC": "Complete Blood Count",
    "BMP": "Basic Metabolic Panel",
    "CMP": "Comprehensive Metabolic Panel",
    "LFT": "Liver Function Tests",
    "RFT": "Renal Function Tests",
    "KFT": "Kidney Function Tests",
    "TFT": "Thyroid Function Tests",
    "HbA1c": "Glycated Hemoglobin",
    "FBS": "Fasting Blood Sugar",
    "PPBS": "Postprandial Blood Sugar",
    "RBS": "Random Blood Sugar",
    "ESR": "Erythrocyte Sedimentation Rate",
    "CRP": "C-Reactive Protein",
    "PT": "Prothrombin Time",
    "INR": "International Normalized Ratio",
    "PTT": "Partial Thromboplastin Time",
    "BUN": "Blood Urea Nitrogen",
    "Cr": "Creatinine",
    "eGFR": "Estimated Glomerular Filtration Rate",
    "ABG": "Arterial Blood Gas",
    "UA": "Urinalysis",
    "PSA": "Prostate-Specific Antigen",
    "TSH": "Thyroid Stimulating Hormone",
    "T3": "Triiodothyronine",
    "T4": "Thyroxine",
    "Hb": "Hemoglobin",
    "Hct": "Hematocrit",
    "WBC": "White Blood Cell Count",
    "RBC": "Red Blood Cell Count",
    "PLT": "Platelet Count",
    "MCV": "Mean Corpuscular Volume",
    "MCH": "Mean Corpuscular Hemoglobin",
    "MCHC": "Mean Corpuscular Hemoglobin Concentration",
    
    # Imaging
    "CT": "Computed Tomography",
    "MRI": "Magnetic Resonance Imaging",
    "USG": "Ultrasonography",
    "X-ray": "X-ray Radiography",
    "ECG": "Electrocardiogram",
    "EKG": "Electrocardiogram",
    "EEG": "Electroencephalogram",
    "EMG": "Electromyography",
    "PET": "Positron Emission Tomography",
    "ECHO": "Echocardiogram",
    
    # Procedures
    "CABG": "Coronary Artery Bypass Grafting",
    "PCI": "Percutaneous Coronary Intervention",
    "PTCA": "Percutaneous Transluminal Coronary Angioplasty",
    "ERCP": "Endoscopic Retrograde Cholangiopancreatography",
    "EGD": "Esophagogastroduodenoscopy",
    "TURP": "Transurethral Resection of the Prostate",
    "ORIF": "Open Reduction Internal Fixation",
    "I&D": "Incision and Drainage",
    "D&C": "Dilation and Curettage",
    "LSCS": "Lower Segment Cesarean Section",
    "C-section": "Cesarean Section",
    
    # Medications & Administration
    "PO": "Per Os (by mouth)",
    "IV": "Intravenous",
    "IM": "Intramuscular",
    "SC": "Subcutaneous",
    "SL": "Sublingual",
    "PR": "Per Rectum",
    "QD": "Once Daily",
    "BID": "Twice Daily",
    "TID": "Three Times Daily",
    "QID": "Four Times Daily",
    "PRN": "As Needed",
    "HS": "At Bedtime",
    "AC": "Before Meals",
    "PC": "After Meals",
    "STAT": "Immediately",
    "OD": "Once Daily / Right Eye",
    "OS": "Left Eye",
    "OU": "Both Eyes",
    
    # Clinical Settings
    "ICU": "Intensive Care Unit",
    "CCU": "Coronary Care Unit",
    "NICU": "Neonatal Intensive Care Unit",
    "PICU": "Pediatric Intensive Care Unit",
    "ED": "Emergency Department",
    "ER": "Emergency Room",
    "OR": "Operating Room",
    "OT": "Operation Theatre",
    "OPD": "Outpatient Department",
    "IPD": "Inpatient Department",
    "HDU": "High Dependency Unit",
    
    # Other Common Abbreviations
    "Pt": "Patient",
    "c/o": "Complaining of",
    "s/p": "Status Post",
    "h/o": "History of",
    "k/c/o": "Known Case of",
    "N/V": "Nausea and Vomiting",
    "SOB": "Shortness of Breath",
    "DOE": "Dyspnea on Exertion",
    "CP": "Chest Pain",
    "LOC": "Loss of Consciousness",
    "ROM": "Range of Motion",
    "WNL": "Within Normal Limits",
    "NAD": "No Acute Distress",
    "PERRLA": "Pupils Equal, Round, Reactive to Light and Accommodation",
    "A&O": "Alert and Oriented",
    "GCS": "Glasgow Coma Scale",
    "ADL": "Activities of Daily Living",
    "DNR": "Do Not Resuscitate",
    "NPO": "Nothing by Mouth",
    "I/O": "Intake and Output",
    "F/U": "Follow Up",
    "D/C": "Discharge/Discontinue",
    "Wt": "Weight",
    "Ht": "Height",
    "yo": "Years Old",
    "y/o": "Years Old",
    "M": "Male",
    "F": "Female",
}


# ============================================================================
# ICD-10 CODE DATABASE (Common codes)
# ============================================================================

ICD10_DATABASE = {
    # Cardiovascular
    "hypertension": {"code": "I10", "description": "Essential (primary) hypertension", "category": "Cardiovascular"},
    "high blood pressure": {"code": "I10", "description": "Essential (primary) hypertension", "category": "Cardiovascular"},
    "heart failure": {"code": "I50.9", "description": "Heart failure, unspecified", "category": "Cardiovascular"},
    "congestive heart failure": {"code": "I50.9", "description": "Heart failure, unspecified", "category": "Cardiovascular"},
    "myocardial infarction": {"code": "I21.9", "description": "Acute myocardial infarction, unspecified", "category": "Cardiovascular"},
    "heart attack": {"code": "I21.9", "description": "Acute myocardial infarction, unspecified", "category": "Cardiovascular"},
    "atrial fibrillation": {"code": "I48.91", "description": "Unspecified atrial fibrillation", "category": "Cardiovascular"},
    "coronary artery disease": {"code": "I25.10", "description": "Atherosclerotic heart disease", "category": "Cardiovascular"},
    "angina": {"code": "I20.9", "description": "Angina pectoris, unspecified", "category": "Cardiovascular"},
    "stroke": {"code": "I63.9", "description": "Cerebral infarction, unspecified", "category": "Cardiovascular"},
    "deep vein thrombosis": {"code": "I82.40", "description": "Acute embolism and thrombosis of unspecified deep veins", "category": "Cardiovascular"},
    
    # Endocrine
    "diabetes mellitus": {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "category": "Endocrine"},
    "diabetes": {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "category": "Endocrine"},
    "type 2 diabetes": {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "category": "Endocrine"},
    "type 1 diabetes": {"code": "E10.9", "description": "Type 1 diabetes mellitus without complications", "category": "Endocrine"},
    "hypothyroidism": {"code": "E03.9", "description": "Hypothyroidism, unspecified", "category": "Endocrine"},
    "hyperthyroidism": {"code": "E05.90", "description": "Thyrotoxicosis, unspecified", "category": "Endocrine"},
    "hyperlipidemia": {"code": "E78.5", "description": "Hyperlipidemia, unspecified", "category": "Endocrine"},
    "obesity": {"code": "E66.9", "description": "Obesity, unspecified", "category": "Endocrine"},
    
    # Respiratory
    "asthma": {"code": "J45.909", "description": "Unspecified asthma, uncomplicated", "category": "Respiratory"},
    "copd": {"code": "J44.9", "description": "Chronic obstructive pulmonary disease, unspecified", "category": "Respiratory"},
    "pneumonia": {"code": "J18.9", "description": "Pneumonia, unspecified organism", "category": "Respiratory"},
    "bronchitis": {"code": "J40", "description": "Bronchitis, not specified as acute or chronic", "category": "Respiratory"},
    "pulmonary embolism": {"code": "I26.99", "description": "Other pulmonary embolism without acute cor pulmonale", "category": "Respiratory"},
    "tuberculosis": {"code": "A15.9", "description": "Respiratory tuberculosis unspecified", "category": "Respiratory"},
    
    # Renal
    "chronic kidney disease": {"code": "N18.9", "description": "Chronic kidney disease, unspecified", "category": "Renal"},
    "acute kidney injury": {"code": "N17.9", "description": "Acute kidney failure, unspecified", "category": "Renal"},
    "urinary tract infection": {"code": "N39.0", "description": "Urinary tract infection, site not specified", "category": "Renal"},
    "kidney stones": {"code": "N20.0", "description": "Calculus of kidney", "category": "Renal"},
    
    # Gastrointestinal
    "gastritis": {"code": "K29.70", "description": "Gastritis, unspecified, without bleeding", "category": "Gastrointestinal"},
    "gerd": {"code": "K21.0", "description": "Gastro-esophageal reflux disease with esophagitis", "category": "Gastrointestinal"},
    "peptic ulcer": {"code": "K27.9", "description": "Peptic ulcer, site unspecified", "category": "Gastrointestinal"},
    "cirrhosis": {"code": "K74.60", "description": "Unspecified cirrhosis of liver", "category": "Gastrointestinal"},
    "hepatitis": {"code": "K75.9", "description": "Inflammatory liver disease, unspecified", "category": "Gastrointestinal"},
    "pancreatitis": {"code": "K85.9", "description": "Acute pancreatitis, unspecified", "category": "Gastrointestinal"},
    
    # Neurological
    "dementia": {"code": "F03.90", "description": "Unspecified dementia without behavioral disturbance", "category": "Neurological"},
    "alzheimer": {"code": "G30.9", "description": "Alzheimer's disease, unspecified", "category": "Neurological"},
    "parkinson": {"code": "G20", "description": "Parkinson's disease", "category": "Neurological"},
    "epilepsy": {"code": "G40.909", "description": "Epilepsy, unspecified, not intractable", "category": "Neurological"},
    "migraine": {"code": "G43.909", "description": "Migraine, unspecified, not intractable", "category": "Neurological"},
    "multiple sclerosis": {"code": "G35", "description": "Multiple sclerosis", "category": "Neurological"},
    
    # Musculoskeletal
    "osteoarthritis": {"code": "M19.90", "description": "Unspecified osteoarthritis, unspecified site", "category": "Musculoskeletal"},
    "rheumatoid arthritis": {"code": "M06.9", "description": "Rheumatoid arthritis, unspecified", "category": "Musculoskeletal"},
    "osteoporosis": {"code": "M81.0", "description": "Age-related osteoporosis without pathological fracture", "category": "Musculoskeletal"},
    "back pain": {"code": "M54.9", "description": "Dorsalgia, unspecified", "category": "Musculoskeletal"},
    "fracture": {"code": "T14.8", "description": "Other injury of unspecified body region", "category": "Musculoskeletal"},
    
    # Mental Health
    "depression": {"code": "F32.9", "description": "Major depressive disorder, single episode, unspecified", "category": "Mental Health"},
    "anxiety": {"code": "F41.9", "description": "Anxiety disorder, unspecified", "category": "Mental Health"},
    "bipolar disorder": {"code": "F31.9", "description": "Bipolar disorder, unspecified", "category": "Mental Health"},
    "schizophrenia": {"code": "F20.9", "description": "Schizophrenia, unspecified", "category": "Mental Health"},
    
    # Infectious
    "sepsis": {"code": "A41.9", "description": "Sepsis, unspecified organism", "category": "Infectious"},
    "covid-19": {"code": "U07.1", "description": "COVID-19", "category": "Infectious"},
    "influenza": {"code": "J11.1", "description": "Influenza due to unidentified influenza virus", "category": "Infectious"},
    "malaria": {"code": "B54", "description": "Unspecified malaria", "category": "Infectious"},
    "dengue": {"code": "A90", "description": "Dengue fever", "category": "Infectious"},
    
    # Cancer
    "cancer": {"code": "C80.1", "description": "Malignant (primary) neoplasm, unspecified", "category": "Oncology"},
    "tumor": {"code": "D49.9", "description": "Neoplasm of unspecified behavior", "category": "Oncology"},
    "leukemia": {"code": "C95.90", "description": "Leukemia, unspecified", "category": "Oncology"},
    "lymphoma": {"code": "C85.90", "description": "Non-Hodgkin lymphoma, unspecified", "category": "Oncology"},
}


# ============================================================================
# DRUG INTERACTIONS DATABASE
# ============================================================================

DRUG_INTERACTIONS = {
    ("warfarin", "aspirin"): {
        "severity": "MAJOR",
        "description": "Increased risk of bleeding when warfarin is combined with aspirin",
        "recommendation": "Monitor closely for signs of bleeding. Consider alternative antiplatelet therapy."
    },
    ("warfarin", "ibuprofen"): {
        "severity": "MAJOR",
        "description": "NSAIDs like ibuprofen increase the risk of GI bleeding and may enhance warfarin's anticoagulant effect",
        "recommendation": "Avoid combination if possible. Use acetaminophen for pain relief."
    },
    ("metformin", "contrast dye"): {
        "severity": "MAJOR",
        "description": "Risk of lactic acidosis when metformin is used with iodinated contrast media",
        "recommendation": "Discontinue metformin 48 hours before and after contrast procedures."
    },
    ("lisinopril", "potassium"): {
        "severity": "MODERATE",
        "description": "ACE inhibitors can increase potassium levels; combination may cause hyperkalemia",
        "recommendation": "Monitor serum potassium levels regularly."
    },
    ("atorvastatin", "clarithromycin"): {
        "severity": "MAJOR",
        "description": "Clarithromycin inhibits CYP3A4, increasing statin levels and risk of myopathy",
        "recommendation": "Consider temporary discontinuation of statin or use azithromycin instead."
    },
    ("clopidogrel", "omeprazole"): {
        "severity": "MODERATE",
        "description": "Omeprazole may reduce the antiplatelet effect of clopidogrel",
        "recommendation": "Consider using pantoprazole or H2 blockers instead."
    },
    ("digoxin", "amiodarone"): {
        "severity": "MAJOR",
        "description": "Amiodarone increases digoxin levels, risk of toxicity",
        "recommendation": "Reduce digoxin dose by 50% when starting amiodarone."
    },
    ("ssri", "tramadol"): {
        "severity": "MAJOR",
        "description": "Increased risk of serotonin syndrome and seizures",
        "recommendation": "Avoid combination or use with extreme caution."
    },
    ("ssri", "maoi"): {
        "severity": "MAJOR",
        "description": "Life-threatening serotonin syndrome risk",
        "recommendation": "Absolutely contraindicated. Wait 2 weeks between medications."
    },
    ("methotrexate", "nsaids"): {
        "severity": "MAJOR",
        "description": "NSAIDs can increase methotrexate toxicity by reducing renal clearance",
        "recommendation": "Avoid NSAIDs in patients on high-dose methotrexate."
    },
    ("ciprofloxacin", "theophylline"): {
        "severity": "MAJOR",
        "description": "Ciprofloxacin inhibits theophylline metabolism, risk of toxicity",
        "recommendation": "Reduce theophylline dose and monitor levels."
    },
    ("amlodipine", "simvastatin"): {
        "severity": "MODERATE",
        "description": "Amlodipine increases simvastatin levels, increasing myopathy risk",
        "recommendation": "Limit simvastatin to 20mg daily when used with amlodipine."
    },
    ("spironolactone", "ace inhibitor"): {
        "severity": "MODERATE",
        "description": "Both medications increase potassium, risk of hyperkalemia",
        "recommendation": "Monitor potassium levels closely."
    },
    ("lithium", "nsaids"): {
        "severity": "MAJOR",
        "description": "NSAIDs can increase lithium levels, risk of toxicity",
        "recommendation": "Avoid combination or monitor lithium levels frequently."
    },
    ("insulin", "beta blocker"): {
        "severity": "MODERATE",
        "description": "Beta blockers can mask hypoglycemia symptoms and prolong hypoglycemic episodes",
        "recommendation": "Use cardioselective beta blockers and educate patient on hypoglycemia signs."
    },
}

# Common drug name variations for matching
DRUG_ALIASES = {
    "aspirin": ["aspirin", "asa", "acetylsalicylic acid", "ecosprin", "disprin"],
    "warfarin": ["warfarin", "coumadin", "acitrom"],
    "ibuprofen": ["ibuprofen", "advil", "motrin", "brufen"],
    "metformin": ["metformin", "glucophage", "glycomet", "glyciphage"],
    "lisinopril": ["lisinopril", "zestril", "prinivil"],
    "atorvastatin": ["atorvastatin", "lipitor", "atorva"],
    "simvastatin": ["simvastatin", "zocor", "simvas"],
    "clopidogrel": ["clopidogrel", "plavix", "clopilet"],
    "omeprazole": ["omeprazole", "prilosec", "omez"],
    "pantoprazole": ["pantoprazole", "protonix", "pantop"],
    "amlodipine": ["amlodipine", "norvasc", "amlong", "amlip"],
    "digoxin": ["digoxin", "lanoxin"],
    "amiodarone": ["amiodarone", "cordarone"],
    "tramadol": ["tramadol", "ultram", "tramazac"],
    "methotrexate": ["methotrexate", "mtx", "trexall"],
    "ciprofloxacin": ["ciprofloxacin", "cipro", "ciplox"],
    "insulin": ["insulin", "regular insulin", "novolog", "humalog", "lantus"],
    "ssri": ["fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram", "prozac", "zoloft", "paxil"],
    "maoi": ["phenelzine", "tranylcypromine", "isocarboxazid", "selegiline"],
    "ace inhibitor": ["lisinopril", "enalapril", "ramipril", "captopril", "perindopril"],
    "beta blocker": ["metoprolol", "atenolol", "propranolol", "carvedilol", "bisoprolol"],
    "nsaids": ["ibuprofen", "naproxen", "diclofenac", "indomethacin", "celecoxib", "meloxicam"],
}


# ============================================================================
# MEDICAL ENTITY PATTERNS FOR NER
# ============================================================================

ENTITY_PATTERNS = {
    "DISEASE": [
        r"\b(diabetes|hypertension|cancer|tumor|infection|syndrome|disease|disorder|failure|deficiency|insufficiency)\b",
        r"\b(pneumonia|bronchitis|asthma|copd|tuberculosis|malaria|dengue|typhoid|covid)\b",
        r"\b(stroke|infarction|thrombosis|embolism|hemorrhage|aneurysm)\b",
        r"\b(cirrhosis|hepatitis|pancreatitis|gastritis|colitis|appendicitis)\b",
        r"\b(arthritis|osteoporosis|osteoarthritis|spondylosis)\b",
        r"\b(depression|anxiety|schizophrenia|dementia|alzheimer|parkinson)\b",
        r"\b(leukemia|lymphoma|carcinoma|melanoma|sarcoma)\b",
    ],
    "DRUG": [
        r"\b(metformin|insulin|glipizide|sitagliptin|pioglitazone)\b",
        r"\b(lisinopril|enalapril|ramipril|losartan|valsartan|amlodipine|atenolol|metoprolol)\b",
        r"\b(atorvastatin|rosuvastatin|simvastatin|pravastatin)\b",
        r"\b(aspirin|clopidogrel|warfarin|heparin|enoxaparin|rivaroxaban)\b",
        r"\b(omeprazole|pantoprazole|ranitidine|famotidine)\b",
        r"\b(amoxicillin|azithromycin|ciprofloxacin|metronidazole|doxycycline)\b",
        r"\b(paracetamol|ibuprofen|diclofenac|naproxen|tramadol|morphine)\b",
        r"\b(prednisolone|dexamethasone|hydrocortisone|methylprednisolone)\b",
        r"\b(fluoxetine|sertraline|escitalopram|amitriptyline|duloxetine)\b",
        r"\b(salbutamol|budesonide|montelukast|theophylline)\b",
    ],
    "PROCEDURE": [
        r"\b(surgery|operation|biopsy|resection|transplant|bypass|angioplasty)\b",
        r"\b(intubation|ventilation|dialysis|transfusion|catheterization)\b",
        r"\b(endoscopy|colonoscopy|bronchoscopy|laparoscopy|arthroscopy)\b",
        r"\b(mri|ct scan|x-ray|ultrasound|echocardiogram|electrocardiogram)\b",
        r"\b(chemotherapy|radiotherapy|immunotherapy|physiotherapy)\b",
    ],
    "ANATOMY": [
        r"\b(heart|lung|liver|kidney|brain|stomach|intestine|colon|pancreas|spleen)\b",
        r"\b(artery|vein|nerve|muscle|bone|joint|cartilage|ligament|tendon)\b",
        r"\b(chest|abdomen|pelvis|thorax|cranium|spine|vertebra)\b",
        r"\b(left|right|bilateral|anterior|posterior|superior|inferior)\s+(lung|kidney|arm|leg|eye|ear)\b",
    ],
    "SYMPTOM": [
        r"\b(pain|ache|discomfort|tenderness|swelling|inflammation)\b",
        r"\b(fever|cough|dyspnea|breathlessness|wheezing|chest pain)\b",
        r"\b(nausea|vomiting|diarrhea|constipation|bloating|anorexia)\b",
        r"\b(headache|dizziness|vertigo|syncope|fatigue|weakness|malaise)\b",
        r"\b(palpitations|edema|cyanosis|pallor|jaundice|rash|pruritus)\b",
        r"\b(polyuria|polydipsia|polyphagia|weight loss|weight gain)\b",
    ],
    "LAB_TEST": [
        r"\b(hemoglobin|hematocrit|wbc|rbc|platelet|mcv|mch|mchc)\b",
        r"\b(creatinine|bun|urea|gfr|electrolytes|sodium|potassium|chloride)\b",
        r"\b(glucose|hba1c|fasting blood sugar|random blood sugar)\b",
        r"\b(ast|alt|alp|bilirubin|albumin|total protein)\b",
        r"\b(tsh|t3|t4|free t4)\b",
        r"\b(troponin|bnp|ck-mb|ldh)\b",
        r"\b(esr|crp|procalcitonin|ferritin|d-dimer)\b",
        r"\b(inr|pt|ptt|aptt|fibrinogen)\b",
    ],
}


# ============================================================================
# MEDICAL NLP CLASS
# ============================================================================

class MedicalNLPProcessor:
    """Comprehensive Medical NLP Processor"""
    
    def __init__(self):
        self.sentence_model = None
        self.sentiment_pipeline = None
        self._initialized = False
    
    def _lazy_init(self):
        """Lazy initialization of models to avoid slow startup"""
        if not self._initialized:
            print("Initializing Medical NLP models...")
            try:
                self.sentence_model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
            except Exception as e:
                print(f"Warning: Could not load sentence model: {e}")
                self.sentence_model = None
            
            try:
                # Use a lightweight sentiment model
                self.sentiment_pipeline = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english",
                    device=-1  # CPU
                )
            except Exception as e:
                print(f"Warning: Could not load sentiment model: {e}")
                self.sentiment_pipeline = None
            
            self._initialized = True
            print("Medical NLP models initialized.")
    
    # ========================================================================
    # NAMED ENTITY RECOGNITION
    # ========================================================================
    
    def extract_entities(self, text: str) -> List[MedicalEntity]:
        """
        Extract medical entities from text using pattern matching and NLP
        """
        entities = []
        text_lower = text.lower()
        
        for entity_type, patterns in ENTITY_PATTERNS.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                    entity = MedicalEntity(
                        text=match.group(),
                        entity_type=entity_type,
                        start=match.start(),
                        end=match.end(),
                        confidence=0.85,  # Pattern-based confidence
                        normalized_name=match.group().lower().strip()
                    )
                    # Avoid duplicates
                    if not any(e.text.lower() == entity.text.lower() and e.entity_type == entity.entity_type for e in entities):
                        entities.append(entity)
        
        # Sort by position in text
        entities.sort(key=lambda x: x.start)
        
        return entities
    
    def get_entity_summary(self, entities: List[MedicalEntity]) -> Dict[str, List[str]]:
        """Group entities by type for easy viewing"""
        summary = defaultdict(list)
        for entity in entities:
            if entity.text not in summary[entity.entity_type]:
                summary[entity.entity_type].append(entity.text)
        return dict(summary)
    
    # ========================================================================
    # ICD-10 CODE MAPPING
    # ========================================================================
    
    def map_to_icd10(self, text: str) -> List[ICD10Code]:
        """
        Map conditions mentioned in text to ICD-10 codes
        """
        icd_codes = []
        text_lower = text.lower()
        
        for condition, code_info in ICD10_DATABASE.items():
            if condition in text_lower:
                # Find the actual text in the original
                pattern = re.compile(re.escape(condition), re.IGNORECASE)
                match = pattern.search(text)
                source = match.group() if match else condition
                
                icd_code = ICD10Code(
                    code=code_info["code"],
                    description=code_info["description"],
                    category=code_info["category"],
                    confidence=0.85,
                    source_text=source
                )
                
                # Avoid duplicates
                if not any(c.code == icd_code.code for c in icd_codes):
                    icd_codes.append(icd_code)
        
        # Sort by category
        icd_codes.sort(key=lambda x: x.category)
        
        return icd_codes
    
    # ========================================================================
    # DRUG INTERACTION DETECTION
    # ========================================================================
    
    def detect_drug_interactions(self, text: str) -> List[DrugInteraction]:
        """
        Detect potential drug-drug interactions from medication list in text
        """
        interactions = []
        text_lower = text.lower()
        
        # Find all drugs mentioned in text
        mentioned_drugs = set()
        
        for drug_class, aliases in DRUG_ALIASES.items():
            for alias in aliases:
                if alias.lower() in text_lower:
                    mentioned_drugs.add(drug_class)
                    break
        
        # Also check entities
        entities = self.extract_entities(text)
        for entity in entities:
            if entity.entity_type == "DRUG":
                drug_name = entity.text.lower()
                for drug_class, aliases in DRUG_ALIASES.items():
                    if drug_name in aliases:
                        mentioned_drugs.add(drug_class)
                        break
        
        # Check for known interactions
        mentioned_list = list(mentioned_drugs)
        for i in range(len(mentioned_list)):
            for j in range(i + 1, len(mentioned_list)):
                drug1, drug2 = mentioned_list[i], mentioned_list[j]
                
                # Check both orderings
                interaction_info = DRUG_INTERACTIONS.get((drug1, drug2)) or DRUG_INTERACTIONS.get((drug2, drug1))
                
                if interaction_info:
                    interaction = DrugInteraction(
                        drug1=drug1.title(),
                        drug2=drug2.title(),
                        severity=interaction_info["severity"],
                        description=interaction_info["description"],
                        recommendation=interaction_info["recommendation"]
                    )
                    interactions.append(interaction)
        
        # Sort by severity
        severity_order = {"MAJOR": 0, "MODERATE": 1, "MINOR": 2}
        interactions.sort(key=lambda x: severity_order.get(x.severity, 3))
        
        return interactions
    
    # ========================================================================
    # MEDICAL ABBREVIATION EXPANSION
    # ========================================================================
    
    def expand_abbreviations(self, text: str) -> Tuple[str, List[AbbreviationExpansion]]:
        """
        Expand medical abbreviations in text
        Returns: (expanded_text, list of expansions made)
        """
        expansions = []
        expanded_text = text
        
        # Sort abbreviations by length (longest first) to avoid partial matches
        sorted_abbrevs = sorted(MEDICAL_ABBREVIATIONS.keys(), key=len, reverse=True)
        
        for abbrev in sorted_abbrevs:
            # Match whole words only, case-insensitive
            pattern = r'\b' + re.escape(abbrev) + r'\b'
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            
            if matches:
                expansion = MEDICAL_ABBREVIATIONS[abbrev]
                
                for match in matches:
                    # Get context (10 chars before and after)
                    start = max(0, match.start() - 20)
                    end = min(len(text), match.end() + 20)
                    context = text[start:end]
                    
                    exp_record = AbbreviationExpansion(
                        abbreviation=match.group(),
                        expansion=expansion,
                        context=context,
                        confidence=0.95
                    )
                    
                    # Avoid duplicate records
                    if not any(e.abbreviation.upper() == exp_record.abbreviation.upper() for e in expansions):
                        expansions.append(exp_record)
                
                # Replace in text with expansion (keep original in parentheses)
                def replace_func(m):
                    return f"{m.group()} ({expansion})"
                
                expanded_text = re.sub(pattern, replace_func, expanded_text, flags=re.IGNORECASE)
        
        return expanded_text, expansions
    
    # ========================================================================
    # SENTIMENT ANALYSIS
    # ========================================================================
    
    def analyze_sentiment(self, text: str) -> List[SentimentResult]:
        """
        Analyze sentiment in clinical text
        Focuses on patient condition, prognosis, and clinical outcomes
        Uses clinically-aware keyword analysis for medical documents
        """
        self._lazy_init()
        
        results = []
        
        # Split into sentences for granular analysis
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # CLINICAL SENTIMENT KEYWORDS (domain-specific)
        
        # Positive clinical indicators
        positive_indicators = [
            # Improvement & Recovery
            "improved", "improving", "improvement", "better", "recovered", "recovering",
            "resolved", "resolving", "healing", "healed", "stabilized", "stable",
            # Good outcomes
            "normal", "within normal limits", "wnl", "good", "excellent", "satisfactory",
            "controlled", "well-controlled", "well controlled", "fair control",
            "manageable", "managed", "adequate", "optimal", "optimized",
            # Positive patient status
            "ambulatory", "oriented", "alert", "cooperative", "responsive",
            "discharged", "tolerating well", "no complications", "uncomplicated",
            "successful", "favorable", "benign", "negative" # negative test = good
        ]
        
        # Negative clinical indicators (actual deterioration)
        negative_indicators = [
            # Deterioration
            "worsening", "worsened", "deteriorating", "deteriorated", "declining",
            "declined", "progressing" , "progressive",
            # Critical conditions
            "critical", "severe", "serious", "acute", "emergency", "urgent",
            "unstable", "uncontrolled", "poorly controlled", "poor control",
            # Failure & Complications
            "failed", "failure", "complicated", "complications", "adverse",
            "unresponsive", "refractory", "resistant",
            # Prognosis
            "terminal", "palliative", "guarded", "grave", "poor prognosis",
            "metastatic", "inoperable", "incurable",
            # Death
            "expired", "deceased", "death", "died", "mortality"
        ]
        
        # NEUTRAL indicators (informational, not sentiment-bearing)
        neutral_exclusions = [
            # These are informational phrases, not negative sentiment
            "does not contain", "not contain", "not available", "not provided",
            "no information", "not specified", "unspecified", "not mentioned",
            "not documented", "no data", "not recorded", "unknown",
            # Test/Procedure terms (neutral descriptors)
            "recommended", "suggest", "consider", "indicated", "advised",
            "monitor", "monitoring", "follow-up", "follow up", "regular",
            # Common medical context
            "diagnosed", "diagnosis", "condition", "patient", "history",
            "treatment", "therapy", "medication", "prevent"
        ]
        
        for sentence in sentences[:15]:  # Analyze up to 15 sentences
            sentence_lower = sentence.lower()
            
            # Skip sentences that are purely informational (not sentiment-bearing)
            is_informational = any(neutral in sentence_lower for neutral in neutral_exclusions[:8])
            
            # Check for clinical sentiment indicators
            positive_match = any(ind in sentence_lower for ind in positive_indicators)
            negative_match = any(ind in sentence_lower for ind in negative_indicators)
            
            # Handle "Fair Control" / "Good Control" specifically for diabetes
            if "control" in sentence_lower:
                if any(x in sentence_lower for x in ["fair control", "good control", "excellent control", "adequate control", "well control"]):
                    positive_match = True
                    negative_match = False
                elif any(x in sentence_lower for x in ["poor control", "uncontrolled", "poorly controlled"]):
                    negative_match = True
                    positive_match = False
            
            # Skip purely informational sentences
            if is_informational and not positive_match and not negative_match:
                continue
            
            # Determine sentiment
            if positive_match and not negative_match:
                sentiment = "POSITIVE"
                confidence = 0.85
            elif negative_match and not positive_match:
                sentiment = "NEGATIVE"
                confidence = 0.85
            elif positive_match and negative_match:
                # Mixed - default to neutral
                sentiment = "NEUTRAL"
                confidence = 0.6
            else:
                # No clear indicators - skip this sentence
                continue
            
            # Determine clinical relevance category
            if any(word in sentence_lower for word in ["prognosis", "outcome", "survival"]):
                relevance = "Prognosis Assessment"
            elif any(word in sentence_lower for word in ["condition", "status", "state"]):
                relevance = "Patient Condition"
            elif any(word in sentence_lower for word in ["treatment", "therapy", "medication", "drug"]):
                relevance = "Treatment Response"
            elif any(word in sentence_lower for word in ["control", "level", "value", "result"]):
                relevance = "Clinical Metrics"
            else:
                relevance = "Clinical Observation"
            
            results.append(SentimentResult(
                text=sentence[:200],  # Truncate for display
                sentiment=sentiment,
                confidence=confidence,
                clinical_relevance=relevance
            ))
        
        return results
    
    # ========================================================================
    # COMPREHENSIVE ANALYSIS
    # ========================================================================
    
    def analyze_document(self, text: str) -> Dict[str, Any]:
        """
        Perform comprehensive medical NLP analysis on a document
        """
        start_time = time.time()
        
        # Run all analyses
        entities = self.extract_entities(text)
        entity_summary = self.get_entity_summary(entities)
        icd_codes = self.map_to_icd10(text)
        drug_interactions = self.detect_drug_interactions(text)
        expanded_text, abbreviations = self.expand_abbreviations(text)
        sentiments = self.analyze_sentiment(text)
        
        processing_time = time.time() - start_time
        
        # Create result dictionary
        result = {
            "entities": {
                "items": [asdict(e) for e in entities],
                "summary": entity_summary,
                "total_count": len(entities)
            },
            "icd10_codes": {
                "items": [asdict(c) for c in icd_codes],
                "total_count": len(icd_codes)
            },
            "drug_interactions": {
                "items": [asdict(i) for i in drug_interactions],
                "total_count": len(drug_interactions),
                "has_major": any(i.severity == "MAJOR" for i in drug_interactions)
            },
            "abbreviations": {
                "items": [asdict(a) for a in abbreviations],
                "total_count": len(abbreviations),
                "expanded_text_sample": expanded_text[:500] if len(expanded_text) > 500 else expanded_text
            },
            "sentiment_analysis": {
                "items": [asdict(s) for s in sentiments],
                "overall": self._calculate_overall_sentiment(sentiments)
            },
            "processing_time": processing_time,
            "timestamp": time.time()
        }
        
        # Log the analysis
        log_event("medical_nlp_analysis", {
            "entities_count": len(entities),
            "icd_codes_count": len(icd_codes),
            "interactions_count": len(drug_interactions),
            "abbreviations_count": len(abbreviations),
            "processing_time": processing_time
        })
        
        return result
    
    def _calculate_overall_sentiment(self, sentiments: List[SentimentResult]) -> Dict:
        """Calculate overall document sentiment"""
        if not sentiments:
            return {"label": "NEUTRAL", "confidence": 0.5}
        
        positive_count = sum(1 for s in sentiments if s.sentiment == "POSITIVE")
        negative_count = sum(1 for s in sentiments if s.sentiment == "NEGATIVE")
        total = len(sentiments)
        
        if positive_count > negative_count:
            label = "POSITIVE"
            confidence = positive_count / total
        elif negative_count > positive_count:
            label = "NEGATIVE"
            confidence = negative_count / total
        else:
            label = "NEUTRAL"
            confidence = 0.5
        
        return {
            "label": label,
            "confidence": round(confidence, 2),
            "positive_statements": positive_count,
            "negative_statements": negative_count,
            "neutral_statements": total - positive_count - negative_count
        }


# ============================================================================
# MODULE-LEVEL FUNCTIONS FOR EASY ACCESS
# ============================================================================

_processor = None

def get_processor() -> MedicalNLPProcessor:
    """Get or create the singleton processor instance"""
    global _processor
    if _processor is None:
        _processor = MedicalNLPProcessor()
    return _processor

def extract_medical_entities(text: str) -> Dict:
    """Extract medical entities from text"""
    processor = get_processor()
    entities = processor.extract_entities(text)
    return {
        "entities": [asdict(e) for e in entities],
        "summary": processor.get_entity_summary(entities)
    }

def get_icd10_codes(text: str) -> List[Dict]:
    """Map text to ICD-10 codes"""
    processor = get_processor()
    codes = processor.map_to_icd10(text)
    return [asdict(c) for c in codes]

def check_drug_interactions(text: str) -> List[Dict]:
    """Check for drug interactions"""
    processor = get_processor()
    interactions = processor.detect_drug_interactions(text)
    return [asdict(i) for i in interactions]

def expand_medical_abbreviations(text: str) -> Dict:
    """Expand medical abbreviations"""
    processor = get_processor()
    expanded_text, expansions = processor.expand_abbreviations(text)
    return {
        "expanded_text": expanded_text,
        "expansions": [asdict(e) for e in expansions]
    }

def analyze_clinical_sentiment(text: str) -> Dict:
    """Analyze sentiment in clinical text"""
    processor = get_processor()
    sentiments = processor.analyze_sentiment(text)
    return {
        "sentiments": [asdict(s) for s in sentiments],
        "overall": processor._calculate_overall_sentiment(sentiments)
    }

def full_medical_analysis(text: str) -> Dict:
    """Perform complete medical NLP analysis"""
    processor = get_processor()
    return processor.analyze_document(text)
