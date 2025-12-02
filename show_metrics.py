#!/usr/bin/env python3
"""
Medical Report Evaluation Metrics Viewer
Shows ROUGE scores from evaluation logs
"""

import json
import os
from pathlib import Path
from datetime import datetime
import statistics
from typing import Dict, List, Any
import argparse

def load_evaluation_logs(logs_dir: str = "logs") -> List[Dict]:
    """Load all evaluation JSON files from logs directory"""
    evaluation_files = []
    logs_path = Path(logs_dir)
    
    if not logs_path.exists():
        print(f"❌ Logs directory '{logs_dir}' not found!")
        return []
    
    # Find all evaluation JSON files
    for file_path in logs_path.glob("evaluation_*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                data['file_name'] = file_path.name
                data['file_path'] = str(file_path)
                evaluation_files.append(data)
        except (json.JSONDecodeError, Exception) as e:
            print(f"⚠️  Could not load {file_path.name}: {e}")
    
    return evaluation_files

def display_rouge_scores(evaluation_data: Dict) -> None:
    """Display ROUGE scores in a formatted way"""
    print("\n" + "="*60)
    print("🔍 ROUGE SCORES (Recall-Oriented Understudy for Gisting Evaluation)")
    print("="*60)
    
    if 'rouge_scores' in evaluation_data:
        rouge_data = evaluation_data['rouge_scores']
        
        print(f"{'Metric':<12} {'Precision':<12} {'Recall':<12} {'F1-Score':<12}")
        print("-" * 50)
        
        for rouge_type, scores in rouge_data.items():
            if isinstance(scores, dict):
                precision = scores.get('precision', 0)
                recall = scores.get('recall', 0)
                f1 = scores.get('f1', 0)
                print(f"{rouge_type.upper():<12} {precision:<12.4f} {recall:<12.4f} {f1:<12.4f}")
    
    elif 'rouge_avg' in evaluation_data:
        print(f"Average ROUGE Score: {evaluation_data['rouge_avg']:.4f}")
    
    else:
        print("❌ No ROUGE scores found in this evaluation")



def display_medical_metrics(evaluation_data: Dict) -> None:
    """Display medical-specific evaluation metrics"""
    if 'medical_metrics' not in evaluation_data:
        return
        
    print("\n" + "="*60)
    print("🏥 MEDICAL-SPECIFIC METRICS")
    print("="*60)
    
    medical_data = evaluation_data['medical_metrics']
    
    print(f"{'Metric':<25} {'Score':<12}")
    print("-" * 40)
    
    for metric, score in medical_data.items():
        if isinstance(score, (int, float)):
            print(f"{metric.replace('_', ' ').title():<25} {score:<12.4f}")

def display_summary_stats(evaluation_data: Dict) -> None:
    """Display summary statistics about the evaluation"""
    if 'summary_stats' not in evaluation_data:
        return
        
    print("\n" + "="*60)
    print("📈 SUMMARY STATISTICS")
    print("="*60)
    
    stats = evaluation_data['summary_stats']
    
    for key, value in stats.items():
        formatted_key = key.replace('_', ' ').title()
        if isinstance(value, (int, float)):
            if 'ratio' in key.lower():
                print(f"{formatted_key:<25}: {value:.4f}")
            else:
                print(f"{formatted_key:<25}: {value}")

def calculate_aggregate_metrics(all_evaluations: List[Dict]) -> None:
    """Calculate and display aggregate metrics across all evaluations"""
    if not all_evaluations:
        print("❌ No evaluation data available for aggregate analysis")
        return
    
    print("\n" + "="*80)
    print("📊 AGGREGATE METRICS ACROSS ALL EVALUATIONS")
    print("="*80)
    
    # Collect all ROUGE F1 scores
    rouge1_f1_scores = []
    rouge2_f1_scores = []
    rougeL_f1_scores = []
    medical_f1_scores = []
    
    for eval_data in all_evaluations:
        # ROUGE scores
        if 'rouge_scores' in eval_data:
            rouge_data = eval_data['rouge_scores']
            if 'rouge1' in rouge_data and 'f1' in rouge_data['rouge1']:
                rouge1_f1_scores.append(rouge_data['rouge1']['f1'])
            if 'rouge2' in rouge_data and 'f1' in rouge_data['rouge2']:
                rouge2_f1_scores.append(rouge_data['rouge2']['f1'])
            if 'rougeL' in rouge_data and 'f1' in rouge_data['rougeL']:
                rougeL_f1_scores.append(rouge_data['rougeL']['f1'])
        

        
        # Medical F1 scores
        if 'medical_metrics' in eval_data and 'medical_f1' in eval_data['medical_metrics']:
            medical_f1_scores.append(eval_data['medical_metrics']['medical_f1'])
    
    # Display aggregate statistics
    def show_aggregate_stats(scores: List[float], metric_name: str):
        if scores:
            print(f"\n{metric_name}:")
            print(f"  📊 Mean: {statistics.mean(scores):.4f}")
            print(f"  📊 Median: {statistics.median(scores):.4f}")
            print(f"  📊 Max: {max(scores):.4f}")
            print(f"  📊 Min: {min(scores):.4f}")
            if len(scores) > 1:
                print(f"  📊 Std Dev: {statistics.stdev(scores):.4f}")
            print(f"  📊 Count: {len(scores)} evaluations")
    
    show_aggregate_stats(rouge1_f1_scores, "ROUGE-1 F1 Scores")
    show_aggregate_stats(rouge2_f1_scores, "ROUGE-2 F1 Scores") 
    show_aggregate_stats(rougeL_f1_scores, "ROUGE-L F1 Scores")
    show_aggregate_stats(medical_f1_scores, "Medical F1 Scores")

def display_evaluation_file(evaluation_data: Dict, show_details: bool = True) -> None:
    """Display a single evaluation file's metrics"""
    file_name = evaluation_data.get('file_name', 'Unknown')
    timestamp = evaluation_data.get('timestamp', evaluation_data.get('ts', 'Unknown'))
    
    print("\n" + "🏥" + "="*78 + "🏥")
    print(f"📋 MEDICAL REPORT EVALUATION: {file_name}")
    if timestamp != 'Unknown':
        if 'T' in str(timestamp):
            try:
                # Parse ISO format timestamp
                dt = datetime.fromisoformat(str(timestamp).replace('Z', '+00:00'))
                formatted_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                print(f"⏰ Timestamp: {formatted_time}")
            except:
                print(f"⏰ Timestamp: {timestamp}")
        else:
            print(f"⏰ Timestamp: {timestamp}")
    print("🏥" + "="*78 + "🏥")
    
    if show_details:
        display_rouge_scores(evaluation_data)
        display_medical_metrics(evaluation_data)
        display_summary_stats(evaluation_data)

def main():
    parser = argparse.ArgumentParser(description='View ROUGE metrics for medical report evaluations')
    parser.add_argument('--logs-dir', default='logs', help='Directory containing evaluation logs')
    parser.add_argument('--file', help='Specific evaluation file to display')
    parser.add_argument('--latest', action='store_true', help='Show only the latest evaluation')
    parser.add_argument('--summary', action='store_true', help='Show only aggregate summary')
    parser.add_argument('--all', action='store_true', help='Show all evaluations')
    
    args = parser.parse_args()
    
    print("🏥 Medical Report Evaluation Metrics Viewer")
    print("=" * 60)
    
    # Load evaluation data
    evaluations = load_evaluation_logs(args.logs_dir)
    
    if not evaluations:
        print("❌ No evaluation files found!")
        print(f"\nTo use this tool:")
        print(f"1. Run your medical report evaluation")
        print(f"2. Ensure evaluation results are saved in '{args.logs_dir}/' directory")
        print(f"3. Run this script again")
        return
    
    # Sort evaluations by timestamp
    evaluations.sort(key=lambda x: x.get('timestamp', x.get('ts', '0')), reverse=True)
    
    print(f"📁 Found {len(evaluations)} evaluation files")
    
    if args.file:
        # Show specific file
        selected_eval = next((e for e in evaluations if args.file in e['file_name']), None)
        if selected_eval:
            display_evaluation_file(selected_eval)
        else:
            print(f"❌ File containing '{args.file}' not found!")
    
    elif args.latest:
        # Show latest evaluation
        if evaluations:
            print("\n🔥 LATEST EVALUATION RESULTS:")
            display_evaluation_file(evaluations[0])
    
    elif args.summary:
        # Show only aggregate summary
        calculate_aggregate_metrics(evaluations)
    
    elif args.all:
        # Show all evaluations
        for i, eval_data in enumerate(evaluations):
            display_evaluation_file(eval_data, show_details=True)
            if i < len(evaluations) - 1:
                print("\n" + "⬇️ " * 30)
        
        # Show aggregate at the end
        calculate_aggregate_metrics(evaluations)
    
    else:
        # Default: Show latest + aggregate summary
        if evaluations:
            print("\n🔥 LATEST EVALUATION RESULTS:")
            display_evaluation_file(evaluations[0])
        
        calculate_aggregate_metrics(evaluations)
        
        print(f"\n💡 TIP: Use --all to see all {len(evaluations)} evaluations")
        print(f"💡 TIP: Use --latest to see only the most recent evaluation")
        print(f"💡 TIP: Use --summary to see only aggregate metrics")

if __name__ == "__main__":
    main()