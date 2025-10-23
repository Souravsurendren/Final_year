import uuid, os, json, math
from datetime import datetime
from .config import LOG_DIR
from pathlib import Path
from tqdm import tqdm

LOG_DIR.mkdir(parents=True, exist_ok=True)

def make_id(prefix="c"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def write_json(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def read_json(path):
    import json
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def log_event(name, payload):
    path = LOG_DIR / f"{name}_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"
    write_json(path, {"ts": now_iso(), **payload})
