#!/usr/bin/env python3
"""
Medical Report Evaluation Analysis
Comprehensive ROUGE metrics analysis for medical document summarization
"""

import json
import os
import statistics
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

def load_all_evaluations(logs_dir: str = "logs") -> List[Dict]:
    """Load all evaluation files and return structured data"""
    evaluations = []
    logs_path = Path(logs_dir)
    
    if not logs_path.exists():
        print(f"❌ Logs directory '{logs_dir}' not found!")
        return []
    
    for file_path in logs_path.glob("evaluation_*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                data['file_name'] = file_path.name
                data['file_path'] = str(file_path)
                evaluations.append(data)
        except (json.JSONDecodeError, Exception) as e:
            print(f"⚠️  Could not load {file_path.name}: {e}")
    
    # Sort by timestamp
    evaluations.sort(key=lambda x: x.get('timestamp', x.get('ts', '0')), reverse=True)
    return evaluations

def extract_metrics_dataframe(evaluations: List[Dict]) -> pd.DataFrame:
    """Convert evaluation data to pandas DataFrame for analysis"""
    rows = []
    
    for eval_data in evaluations:
        row = {
            'file_name': eval_data.get('file_name', ''),
            'timestamp': eval_data.get('timestamp', eval_data.get('ts', '')),
        }
        
        # ROUGE scores
        if 'rouge_scores' in eval_data:
            rouge_data = eval_data['rouge_scores']
            for rouge_type in ['rouge1', 'rouge2', 'rougeL']:
                if rouge_type in rouge_data:
                    for metric in ['precision', 'recall', 'f1']:
                        if metric in rouge_data[rouge_type]:
                            row[f'{rouge_type}_{metric}'] = rouge_data[rouge_type][metric]
        
        # Handle simplified ROUGE averages
        if 'rouge_avg' in eval_data:
            row['rouge_avg'] = eval_data['rouge_avg']
        
        # Medical metrics
        if 'medical_metrics' in eval_data:
            medical_data = eval_data['medical_metrics']
            for metric, value in medical_data.items():
                row[f'medical_{metric}'] = value
        
        # Summary statistics
        if 'summary_stats' in eval_data:
            stats_data = eval_data['summary_stats']
            for stat, value in stats_data.items():
                row[f'summary_{stat}'] = value
        
        rows.append(row)
    
    return pd.DataFrame(rows)

def create_visualization_plots(df: pd.DataFrame, output_dir: str = "evaluation_plots"):
    """Create visualization plots for the metrics"""
    
    # Create output directory
    Path(output_dir).mkdir(exist_ok=True)
    
    # Set style
    plt.style.use('seaborn-v0_8' if 'seaborn-v0_8' in plt.style.available else 'default')
    sns.set_palette("husl")
    
    # 1. ROUGE Metrics Over Time
    if any(col.startswith('rouge') for col in df.columns):
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('ROUGE Metrics Analysis', fontsize=16, fontweight='bold')
        
        # ROUGE F1 scores
        rouge_f1_cols = [col for col in df.columns if col.endswith('_f1') and col.startswith('rouge')]
        if rouge_f1_cols:
            ax = axes[0, 0]
            for col in rouge_f1_cols:
                if col in df.columns and df[col].notna().any():
                    ax.plot(df.index, df[col], marker='o', label=col.replace('_f1', '').upper(), linewidth=2, markersize=6)
            ax.set_title('ROUGE F1 Scores Over Evaluations')
            ax.set_xlabel('Evaluation Index')
            ax.set_ylabel('F1 Score')
            ax.legend()
            ax.grid(True, alpha=0.3)
            ax.set_ylim(0, 1)
        
        # ROUGE Precision vs Recall
        if 'rouge1_precision' in df.columns and 'rouge1_recall' in df.columns:
            ax = axes[0, 1]
            ax.scatter(df['rouge1_recall'], df['rouge1_precision'], alpha=0.6, s=100, label='ROUGE-1')
            if 'rouge2_precision' in df.columns and 'rouge2_recall' in df.columns:
                ax.scatter(df['rouge2_recall'], df['rouge2_precision'], alpha=0.6, s=100, label='ROUGE-2')
            ax.plot([0, 1], [0, 1], 'k--', alpha=0.3)
            ax.set_title('ROUGE Precision vs Recall')
            ax.set_xlabel('Recall')
            ax.set_ylabel('Precision')
            ax.legend()
            ax.grid(True, alpha=0.3)
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
        
        # ROUGE Distribution
        rouge_metrics = [col for col in df.columns if 'rouge' in col and col.endswith('_f1')]
        if rouge_metrics:
            ax = axes[1, 0]
            df[rouge_metrics].boxplot(ax=ax)
            ax.set_title('ROUGE F1 Score Distribution')
            ax.set_ylabel('F1 Score')
            ax.tick_params(axis='x', rotation=45)
            ax.grid(True, alpha=0.3)
        
        # ROUGE Average if available
        if 'rouge_avg' in df.columns:
            ax = axes[1, 1]
            ax.hist(df['rouge_avg'].dropna(), bins=10, alpha=0.7, color='skyblue', edgecolor='black')
            ax.set_title('ROUGE Average Score Distribution')
            ax.set_xlabel('ROUGE Average')
            ax.set_ylabel('Frequency')
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/rouge_analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
    

    
    # 3. Medical Metrics
    medical_cols = [col for col in df.columns if col.startswith('medical_')]
    if medical_cols:
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('Medical-Specific Metrics Analysis', fontsize=16, fontweight='bold')
        
        # Medical metrics over time
        ax = axes[0, 0]
        for col in ['medical_medical_precision', 'medical_medical_recall', 'medical_medical_f1']:
            if col in df.columns and df[col].notna().any():
                label = col.replace('medical_medical_', '').title()
                ax.plot(df.index, df[col], marker='o', label=label, linewidth=2, markersize=6)
        ax.set_title('Medical Metrics Over Evaluations')
        ax.set_xlabel('Evaluation Index')
        ax.set_ylabel('Score')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 1)
        
        # Entity-specific recall
        entity_cols = [col for col in medical_cols if col.endswith('_recall') and col != 'medical_medical_recall']
        if entity_cols:
            ax = axes[0, 1]
            entity_data = df[entity_cols].mean().sort_values(ascending=True)
            entity_data.plot(kind='barh', ax=ax, color='green', alpha=0.7)
            ax.set_title('Average Entity Recall Scores')
            ax.set_xlabel('Recall Score')
            labels = [label.replace('medical_', '').replace('_recall', '').title() for label in entity_data.index]
            ax.set_yticklabels(labels)
            ax.grid(True, alpha=0.3)
        
        # Medical metrics distribution
        key_medical_cols = [col for col in medical_cols if any(metric in col for metric in ['precision', 'recall', 'f1'])]
        if key_medical_cols:
            ax = axes[1, 0]
            df[key_medical_cols[:5]].boxplot(ax=ax)  # Limit to first 5 to avoid overcrowding
            ax.set_title('Medical Metrics Distribution')
            ax.set_ylabel('Score')
            ax.tick_params(axis='x', rotation=45)
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/medical_analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    print(f"✅ Visualization plots saved in '{output_dir}/' directory")

def generate_evaluation_report(evaluations: List[Dict], output_file: str = "evaluation_report.md"):
    """Generate a comprehensive markdown report"""
    
    if not evaluations:
        print("❌ No evaluation data available for report generation")
        return
    
    df = extract_metrics_dataframe(evaluations)
    
    report = []
    report.append("# 🏥 Medical Report Evaluation Analysis")
    report.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"**Total Evaluations:** {len(evaluations)}")
    report.append("")
    
    # Latest Results
    if evaluations:
        latest = evaluations[0]
        report.append("## 📋 Latest Evaluation Results")
        report.append(f"**File:** {latest.get('file_name', 'Unknown')}")
        report.append(f"**Timestamp:** {latest.get('timestamp', latest.get('ts', 'Unknown'))}")
        report.append("")
        
        if 'rouge_scores' in latest:
            report.append("### 🎯 ROUGE Scores")
            rouge_data = latest['rouge_scores']
            report.append("| Metric | Precision | Recall | F1-Score |")
            report.append("|--------|-----------|--------|----------|")
            for rouge_type, scores in rouge_data.items():
                if isinstance(scores, dict):
                    p = scores.get('precision', 0)
                    r = scores.get('recall', 0)
                    f1 = scores.get('f1', 0)
                    report.append(f"| {rouge_type.upper()} | {p:.4f} | {r:.4f} | {f1:.4f} |")
            report.append("")
        

        
        if 'medical_metrics' in latest:
            report.append("### 🏥 Medical Metrics")
            medical_data = latest['medical_metrics']
            report.append("| Metric | Score |")
            report.append("|--------|-------|")
            for metric, score in medical_data.items():
                formatted_metric = metric.replace('_', ' ').title()
                report.append(f"| {formatted_metric} | {score:.4f} |")
            report.append("")
    
    # Aggregate Statistics
    report.append("## 📊 Aggregate Statistics")
    
    # ROUGE aggregates
    rouge_f1_cols = [col for col in df.columns if col.endswith('_f1') and col.startswith('rouge')]
    if rouge_f1_cols:
        report.append("### ROUGE F1 Score Statistics")
        report.append("| Metric | Mean | Median | Max | Min | Std Dev | Count |")
        report.append("|--------|------|--------|-----|-----|---------|-------|")
        
        for col in rouge_f1_cols:
            if col in df.columns and df[col].notna().any():
                values = df[col].dropna()
                if len(values) > 0:
                    mean_val = values.mean()
                    median_val = values.median()
                    max_val = values.max()
                    min_val = values.min()
                    std_val = values.std() if len(values) > 1 else 0
                    count_val = len(values)
                    
                    metric_name = col.replace('_f1', '').upper()
                    report.append(f"| {metric_name} | {mean_val:.4f} | {median_val:.4f} | {max_val:.4f} | {min_val:.4f} | {std_val:.4f} | {count_val} |")
        report.append("")
    

    
    # Interpretation
    report.append("## 📝 Metric Interpretation")
    report.append("### ROUGE Scores")
    report.append("- **ROUGE-1**: Measures unigram (single word) overlap between generated and reference text")
    report.append("- **ROUGE-2**: Measures bigram (two consecutive words) overlap")
    report.append("- **ROUGE-L**: Measures longest common subsequence, captures sentence-level structure")
    report.append("- **Score Range**: 0.0 - 1.0 (higher is better)")
    report.append("")
    

    
    report.append("### Medical Metrics")
    report.append("- **Medical Precision/Recall/F1**: Accuracy of medical entity extraction")
    report.append("- **Entity-specific Recall**: Performance on anatomical terms, symptoms, procedures, etc.")
    report.append("- **Score Range**: 0.0 - 1.0 (higher is better)")
    report.append("")
    
    # Performance Benchmarks
    report.append("## 🎯 Performance Benchmarks")
    report.append("### General Guidelines")
    report.append("- **ROUGE-1 F1 > 0.5**: Good summary quality")
    report.append("- **ROUGE-2 F1 > 0.2**: Adequate phrase-level similarity")  
    report.append("- **ROUGE-L F1 > 0.4**: Good structural similarity")
    report.append("- **Medical F1 > 0.7**: Good medical entity extraction")
    report.append("")
    
    # Recommendations
    latest_rouge1_f1 = 0
    latest_medical_f1 = 0
    
    if evaluations and 'rouge_scores' in evaluations[0]:
        latest_rouge1_f1 = evaluations[0]['rouge_scores'].get('rouge1', {}).get('f1', 0)
    if evaluations and 'medical_metrics' in evaluations[0]:
        latest_medical_f1 = evaluations[0]['medical_metrics'].get('medical_f1', 0)
    
    report.append("## 💡 Recommendations")
    
    if latest_rouge1_f1 < 0.5:
        report.append("- **ROUGE-1 F1 is below 0.5**: Consider improving content overlap with reference summaries")
    if latest_medical_f1 < 0.7:
        report.append("- **Medical F1 is below 0.7**: Enhance medical entity recognition and extraction")
    
    report.append("- Regularly monitor metrics trends over time")
    report.append("- Consider domain-specific fine-tuning for better medical accuracy")
    report.append("- Evaluate with diverse medical document types")
    report.append("")
    
    # Write report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print(f"✅ Comprehensive evaluation report saved to '{output_file}'")

def main():
    print("🏥 Medical Report Evaluation Analysis Tool")
    print("=" * 60)
    
    # Load evaluations
    evaluations = load_all_evaluations()
    
    if not evaluations:
        print("❌ No evaluation files found in logs/ directory")
        return
    
    print(f"📁 Found {len(evaluations)} evaluation files")
    
    # Convert to DataFrame for analysis
    df = extract_metrics_dataframe(evaluations)
    print(f"📊 Extracted metrics for {len(df)} evaluations")
    
    # Check if visualization packages are available
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        # Create visualizations
        print("📈 Creating visualization plots...")
        create_visualization_plots(df)
        
    except ImportError:
        print("⚠️  Matplotlib/Seaborn not available. Skipping visualizations.")
        print("   Install with: pip install matplotlib seaborn")
    
    # Generate comprehensive report
    print("📝 Generating comprehensive evaluation report...")
    generate_evaluation_report(evaluations)
    
    print("\n✅ Analysis complete!")
    print("📄 Check 'evaluation_report.md' for detailed analysis")
    print("📊 Check 'evaluation_plots/' directory for visualizations")
    print("🌐 Open 'metrics_dashboard.html' in browser for interactive dashboard")

if __name__ == "__main__":
    main()