"""Gold table upsert writers."""

from __future__ import annotations

import json
from typing import Any, Dict, Iterable, Optional, Tuple


def ensure_run(db, run_id: str, description: str = "", analysis_type: str = "heuristic") -> None:
    db.execute(
        """
        INSERT INTO gl_runs (run_id, description, analysis_type)
        VALUES (%s, %s, %s)
        ON CONFLICT (run_id) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, gl_runs.description),
          analysis_type = COALESCE(EXCLUDED.analysis_type, gl_runs.analysis_type)
        """,
        (run_id, description, analysis_type),
    )


def upsert_prediction(db, run_id: str, canonical_post_id: str, pred: Dict[str, Any]) -> None:
    db.execute(
        """
        INSERT INTO gl_post_predictions (
          canonical_post_id, run_id,
          pred_is_fashion, pred_is_fashion_conf,
          pred_language, pred_language_conf,
          translation_en, translation_model,
          sentiment, sentiment_conf,
          topic_summary,
          category, category_conf,
          subcategory, subcategory_conf,
          analysis_type,
          evidence
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (canonical_post_id, run_id)
        DO UPDATE SET
          pred_is_fashion = EXCLUDED.pred_is_fashion,
          pred_is_fashion_conf = EXCLUDED.pred_is_fashion_conf,
          pred_language = EXCLUDED.pred_language,
          pred_language_conf = EXCLUDED.pred_language_conf,
          translation_en = EXCLUDED.translation_en,
          translation_model = EXCLUDED.translation_model,
          sentiment = EXCLUDED.sentiment,
          sentiment_conf = EXCLUDED.sentiment_conf,
          topic_summary = EXCLUDED.topic_summary,
          category = EXCLUDED.category,
          category_conf = EXCLUDED.category_conf,
          subcategory = EXCLUDED.subcategory,
          subcategory_conf = EXCLUDED.subcategory_conf,
          analysis_type = EXCLUDED.analysis_type,
          evidence = EXCLUDED.evidence,
          created_at = now()
        """,
        (
            canonical_post_id,
            run_id,
            pred.get("pred_is_fashion"),
            pred.get("pred_is_fashion_conf"),
            pred.get("pred_language"),
            pred.get("pred_language_conf"),
            pred.get("translation_en"),
            pred.get("translation_model"),
            pred.get("sentiment"),
            pred.get("sentiment_conf"),
            pred.get("topic_summary"),
            pred.get("category"),
            pred.get("category_conf"),
            pred.get("subcategory"),
            pred.get("subcategory_conf"),
            pred.get("analysis_type", "heuristic"),
            json.dumps(pred.get("evidence") or {}),
        ),
    )


def upsert_predictions_bulk(
    db,
    rows: Iterable[Tuple[str, str, Dict[str, Any]]],
    batch_size: int = 500,
) -> None:
    payload = list(rows)
    if not payload:
        return

    sql = """
        INSERT INTO gl_post_predictions (
          canonical_post_id, run_id,
          pred_is_fashion, pred_is_fashion_conf,
          pred_language, pred_language_conf,
          translation_en, translation_model,
          sentiment, sentiment_conf,
          topic_summary,
          category, category_conf,
          subcategory, subcategory_conf,
          analysis_type,
          evidence
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (canonical_post_id, run_id)
        DO UPDATE SET
          pred_is_fashion = EXCLUDED.pred_is_fashion,
          pred_is_fashion_conf = EXCLUDED.pred_is_fashion_conf,
          pred_language = EXCLUDED.pred_language,
          pred_language_conf = EXCLUDED.pred_language_conf,
          translation_en = EXCLUDED.translation_en,
          translation_model = EXCLUDED.translation_model,
          sentiment = EXCLUDED.sentiment,
          sentiment_conf = EXCLUDED.sentiment_conf,
          topic_summary = EXCLUDED.topic_summary,
          category = EXCLUDED.category,
          category_conf = EXCLUDED.category_conf,
          subcategory = EXCLUDED.subcategory,
          subcategory_conf = EXCLUDED.subcategory_conf,
          analysis_type = EXCLUDED.analysis_type,
          evidence = EXCLUDED.evidence,
          created_at = now()
    """

    for i in range(0, len(payload), batch_size):
        chunk = payload[i : i + batch_size]
        values = []
        for canonical_post_id, run_id, pred in chunk:
            values.append(
                (
                    canonical_post_id,
                    run_id,
                    pred.get("pred_is_fashion"),
                    pred.get("pred_is_fashion_conf"),
                    pred.get("pred_language"),
                    pred.get("pred_language_conf"),
                    pred.get("translation_en"),
                    pred.get("translation_model"),
                    pred.get("sentiment"),
                    pred.get("sentiment_conf"),
                    pred.get("topic_summary"),
                    pred.get("category"),
                    pred.get("category_conf"),
                    pred.get("subcategory"),
                    pred.get("subcategory_conf"),
                    pred.get("analysis_type", "heuristic"),
                    json.dumps(pred.get("evidence") or {}),
                )
            )
        db.executemany(sql, values)


def upsert_horizon_metric(
    db,
    run_id: str,
    canonical_post_id: str,
    horizon_type: str,
    likes: Optional[int],
    comments: Optional[int],
    shares: Optional[int],
    saves: Optional[int],
    views: Optional[int],
    followers_at_post: Optional[int],
    engagement_score: Optional[float],
) -> None:
    db.execute(
        """
        INSERT INTO gl_post_metrics_horizon (
          canonical_post_id, run_id, horizon_type,
          likes, comments, shares, saves, views,
          followers_at_post, engagement_score
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (canonical_post_id, run_id, horizon_type)
        DO UPDATE SET likes = EXCLUDED.likes,
                      comments = EXCLUDED.comments,
                      shares = EXCLUDED.shares,
                      saves = EXCLUDED.saves,
                      views = EXCLUDED.views,
                      followers_at_post = EXCLUDED.followers_at_post,
                      engagement_score = EXCLUDED.engagement_score,
                      created_at = now()
        """,
        (
            canonical_post_id,
            run_id,
            horizon_type,
            likes,
            comments,
            shares,
            saves,
            views,
            followers_at_post,
            engagement_score,
        ),
    )
