# 🏥 Medical Report Evaluation Analysis
**Generated:** 2025-10-24 22:38:50
**Total Evaluations:** 14

## 📋 Latest Evaluation Results
**File:** evaluation_sample_1761324085.json
**Timestamp:** 2025-10-24T22:11:25

### 🎯 ROUGE Scores
| Metric | Precision | Recall | F1-Score |
|--------|-----------|--------|----------|
| ROUGE1 | 0.6375 | 0.5312 | 0.5795 |
| ROUGE2 | 0.3038 | 0.2526 | 0.2759 |
| ROUGEL | 0.5625 | 0.4688 | 0.5114 |

### 🏥 Medical Metrics
| Metric | Score |
|--------|-------|
| Medical Recall | 0.5000 |
| Medical Precision | 0.6667 |
| Medical F1 | 0.5714 |
| Anatomical Recall | 0.5000 |
| Symptoms Recall | 1.0000 |
| Procedures Recall | 0.0000 |
| Medications Recall | 1.0000 |
| Conditions Recall | 1.0000 |

## 📊 Aggregate Statistics
### ROUGE F1 Score Statistics
| Metric | Mean | Median | Max | Min | Std Dev | Count |
|--------|------|--------|-----|-----|---------|-------|
| ROUGE1 | 0.4968 | 0.5795 | 0.5795 | 0.0000 | 0.2190 | 7 |
| ROUGE2 | 0.2365 | 0.2759 | 0.2759 | 0.0000 | 0.1043 | 7 |
| ROUGEL | 0.4383 | 0.5114 | 0.5114 | 0.0000 | 0.1933 | 7 |

## 📝 Metric Interpretation
### ROUGE Scores
- **ROUGE-1**: Measures unigram (single word) overlap between generated and reference text
- **ROUGE-2**: Measures bigram (two consecutive words) overlap
- **ROUGE-L**: Measures longest common subsequence, captures sentence-level structure
- **Score Range**: 0.0 - 1.0 (higher is better)

### Medical Metrics
- **Medical Precision/Recall/F1**: Accuracy of medical entity extraction
- **Entity-specific Recall**: Performance on anatomical terms, symptoms, procedures, etc.
- **Score Range**: 0.0 - 1.0 (higher is better)

## 🎯 Performance Benchmarks
### General Guidelines
- **ROUGE-1 F1 > 0.5**: Good summary quality
- **ROUGE-2 F1 > 0.2**: Adequate phrase-level similarity
- **ROUGE-L F1 > 0.4**: Good structural similarity
- **Medical F1 > 0.7**: Good medical entity extraction

## 💡 Recommendations
- **Medical F1 is below 0.7**: Enhance medical entity recognition and extraction
- Regularly monitor metrics trends over time
- Consider domain-specific fine-tuning for better medical accuracy
- Evaluate with diverse medical document types
