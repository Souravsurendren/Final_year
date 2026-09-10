"""
Log Cleanup Utility
Removes old log files to prevent disk space issues
"""

import os
import time
from pathlib import Path
from datetime import datetime, timedelta

def cleanup_old_logs(log_dir: str = "logs", days_to_keep: int = 7, max_files: int = 100):
    """
    Clean up old log files
    
    Args:
        log_dir: Directory containing log files
        days_to_keep: Keep logs from last N days
        max_files: Maximum number of log files to keep
    """
    log_path = Path(log_dir)
    if not log_path.exists():
        print(f"Log directory {log_dir} does not exist")
        return
    
    # Get all JSON log files
    log_files = list(log_path.glob("*.json"))
    
    print(f"Found {len(log_files)} log files")
    
    # Calculate cutoff time
    cutoff_time = time.time() - (days_to_keep * 24 * 60 * 60)
    
    deleted_count = 0
    
    # Delete old files
    for log_file in log_files:
        try:
            file_time = log_file.stat().st_mtime
            if file_time < cutoff_time:
                log_file.unlink()
                deleted_count += 1
        except Exception as e:
            print(f"Error deleting {log_file}: {e}")
    
    print(f"Deleted {deleted_count} old log files (older than {days_to_keep} days)")
    
    # If still too many files, delete oldest
    remaining_files = list(log_path.glob("*.json"))
    if len(remaining_files) > max_files:
        # Sort by modification time
        remaining_files.sort(key=lambda x: x.stat().st_mtime)
        
        # Delete oldest files
        files_to_delete = remaining_files[:len(remaining_files) - max_files]
        for log_file in files_to_delete:
            try:
                log_file.unlink()
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting {log_file}: {e}")
        
        print(f"Deleted {len(files_to_delete)} additional files to stay under {max_files} limit")
    
    print(f"Total deleted: {deleted_count} files")
    print(f"Remaining: {len(list(log_path.glob('*.json')))} files")

if __name__ == "__main__":
    cleanup_old_logs(days_to_keep=7, max_files=100)
