"""Bronze JSONL reader with minimal schema validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Generator


REQUIRED_KEYS = ["post_id", "user", "timestamp_utc"]


def iter_instagram_jsonl(path: str) -> Generator[Dict, None, None]:
    jsonl = Path(path)
    if not jsonl.exists():
        raise FileNotFoundError(f"Bronze JSONL not found: {path}")

    with jsonl.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            for key in REQUIRED_KEYS:
                if key not in payload:
                    raise ValueError(f"Line {line_no}: missing key {key}")
            if "user_id" not in payload.get("user", {}):
                raise ValueError(f"Line {line_no}: missing user.user_id")
            yield payload
