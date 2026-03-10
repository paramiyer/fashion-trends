"""OpenAI Batch API helpers for Gold enrichment."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Optional


def _load_openai_client():
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for batch operations")
    return OpenAI(api_key=api_key)


def _render_prompt(template: str, values: Dict[str, Any]) -> str:
    out = template
    for k, v in values.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


def prepare_batch_jsonl(
    db,
    run_id: str,
    out_path: str,
    prompt_path: str,
    model_name: str,
    offset: int = 0,
    limit: int = 5000,
) -> int:
    rows = db.fetchall(
        """
        SELECT p.canonical_post_id, p.text,
               COALESCE(array_agg(t.tag ORDER BY t.tag_id) FILTER (WHERE t.tag_id IS NOT NULL), '{}') AS hashtags
        FROM sl_posts p
        LEFT JOIN sl_post_tags pt ON pt.canonical_post_id = p.canonical_post_id
        LEFT JOIN sl_tags t ON t.tag_id = pt.tag_id AND t.tag_type='hashtag'
        GROUP BY p.canonical_post_id, p.text
        ORDER BY p.published_at DESC
        OFFSET %s
        LIMIT %s
        """,
        (offset, limit),
    )

    prompt_template = Path(prompt_path).read_text(encoding="utf-8")
    out_file = Path(out_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    with out_file.open("w", encoding="utf-8") as f:
        for row in rows:
            payload_prompt = _render_prompt(
                prompt_template,
                {
                    "canonical_post_id": row["canonical_post_id"],
                    "original_text": row.get("text") or "",
                    "hashtags_json": json.dumps(row.get("hashtags") or [], ensure_ascii=False),
                },
            )
            req = {
                "custom_id": row["canonical_post_id"],
                "method": "POST",
                "url": "/v1/responses",
                "body": {
                    "model": model_name,
                    "input": payload_prompt,
                    "reasoning": {"effort": "minimal"},
                    "text": {"verbosity": "low"},
                    "max_output_tokens": 900,
                },
            }
            f.write(json.dumps(req, ensure_ascii=False) + "\n")

    return len(rows)


def submit_batch(input_jsonl_path: str, completion_window: str = "24h") -> str:
    client = _load_openai_client()
    with open(input_jsonl_path, "rb") as f:
        upload = client.files.create(file=f, purpose="batch")

    batch = client.batches.create(
        input_file_id=upload.id,
        endpoint="/v1/responses",
        completion_window=completion_window,
    )
    return batch.id


def get_batch_status(batch_id: str) -> Dict[str, Any]:
    client = _load_openai_client()
    b = client.batches.retrieve(batch_id)
    return {
        "id": b.id,
        "status": b.status,
        "input_file_id": getattr(b, "input_file_id", None),
        "output_file_id": getattr(b, "output_file_id", None),
        "error_file_id": getattr(b, "error_file_id", None),
        "request_counts": getattr(b, "request_counts", None),
    }


def download_batch_output(batch_id: str, out_jsonl_path: str) -> str:
    client = _load_openai_client()
    b = client.batches.retrieve(batch_id)
    output_file_id = getattr(b, "output_file_id", None)
    if not output_file_id:
        raise RuntimeError(f"Batch {batch_id} has no output_file_id yet. status={b.status}")

    content = client.files.content(output_file_id)
    out_file = Path(out_jsonl_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    data = content.read()
    if isinstance(data, bytes):
        out_file.write_bytes(data)
    else:
        out_file.write_text(str(data), encoding="utf-8")

    return str(out_file)


def _response_to_text(resp_body: Dict[str, Any]) -> str:
    text = (resp_body.get("output_text") or "").strip()
    if text:
        return text

    output = resp_body.get("output") or []
    parts = []
    for item in output:
        for c in item.get("content", []) or []:
            if c.get("type") in {"output_text", "text"} and c.get("text"):
                parts.append(c["text"])
    return "\n".join(parts).strip()


def _extract_json(raw_text: str) -> Optional[Dict[str, Any]]:
    s = raw_text.strip()
    if not s:
        return None
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        s = s[start : end + 1]
    try:
        out = json.loads(s)
    except Exception:
        return None
    return out if isinstance(out, dict) else None


def ingest_batch_output(db, run_id: str, output_jsonl_path: str) -> int:
    from .gl_writer import ensure_run, upsert_predictions_bulk

    ensure_run(db, run_id, description="Batch API enrichment run", analysis_type="ai")

    rows = []
    with open(output_jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            custom_id = record.get("custom_id")
            resp = ((record.get("response") or {}).get("body") or {})
            raw = _response_to_text(resp)
            parsed = _extract_json(raw)
            if not custom_id or not parsed:
                continue

            pred = {
                "pred_is_fashion": bool(parsed.get("is_fashion", False)),
                "pred_is_fashion_conf": float(parsed.get("fashion_confidence") or 0.0),
                "pred_language": str(parsed.get("language") or "other"),
                "pred_language_conf": float(parsed.get("language_confidence") or 0.0),
                "translation_en": str(parsed.get("translation_en") or ""),
                "translation_model": str(parsed.get("translation_model") or "gpt-5-nano"),
                "sentiment": str(parsed.get("sentiment") or "Neutral"),
                "sentiment_conf": float(parsed.get("sentiment_confidence") or 0.0),
                "topic_summary": str(parsed.get("topic_summary") or ""),
                "category": parsed.get("category"),
                "category_conf": parsed.get("category_confidence"),
                "subcategory": parsed.get("subcategory"),
                "subcategory_conf": parsed.get("subcategory_confidence"),
                "analysis_type": "ai",
                "evidence": parsed.get("evidence") or {},
            }
            rows.append((custom_id, run_id, pred))

    upsert_predictions_bulk(db, rows, batch_size=500)
    return len(rows)
