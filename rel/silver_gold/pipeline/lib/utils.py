"""Utility helpers."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List


def parse_iso_utc(value: str) -> datetime:
    if not value:
        raise ValueError("Missing datetime")
    value = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_hashtag(tag: str) -> str:
    return tag.strip().lstrip("#").lower()


def safe_json_loads(raw: str, default: Any) -> Any:
    try:
        return json.loads(raw)
    except Exception:
        return default


def load_yaml_file(path: Path) -> Dict[str, Any]:
    try:
        import yaml
    except ImportError as exc:
        raise RuntimeError("pyyaml is required. Install via requirements.txt") from exc

    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def rolling_zscore(values: List[float], window: int = 14) -> List[float]:
    out: List[float] = []
    for idx, current in enumerate(values):
        start = max(0, idx - window)
        hist = values[start:idx]
        if len(hist) < 2:
            out.append(0.0)
            continue
        mean = sum(hist) / len(hist)
        var = sum((x - mean) ** 2 for x in hist) / len(hist)
        std = var ** 0.5
        if std == 0:
            out.append(0.0)
        else:
            out.append((current - mean) / std)
    return out
