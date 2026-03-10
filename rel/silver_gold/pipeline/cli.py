#!/usr/bin/env python3
"""CLI for Bronze->Silver->Gold processing."""

from __future__ import annotations

import argparse
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv

from lib.agents import AgentRunner
from lib.db import Database, resolve_db_url
from lib.sl_loader import load_instagram_jsonl
from lib.trend_agg import (
    aggregate_daily_trends,
    build_trends_by_category,
    compute_horizon_metrics,
    rank_users_daily,
)
from lib.kpi_agg import (
    compute_trend_kpis,
    compute_content_kpis,
    compute_user_influence_7d,
)
from lib.utils import load_yaml_file
from lib.gl_writer import ensure_run, upsert_predictions_bulk
from lib.batch_jobs import (
    prepare_batch_jsonl,
    submit_batch,
    get_batch_status,
    download_batch_output,
    ingest_batch_output,
)


def load_config(config_path: str | None) -> Dict[str, Any]:
    default_path = Path("rel/silver_gold/pipeline/config.example.yaml")
    path = Path(config_path) if config_path else default_path
    if not path.exists():
        return {}
    return load_yaml_file(path)


def cmd_sl_load(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        inserted = load_instagram_jsonl(
            db,
            args.jsonl,
            platform=args.platform,
            start_offset=args.offset,
            limit=args.limit,
            batch_size=args.batch_size,
            show_progress=not args.no_progress,
            workers=args.workers,
        )
    print(
        f"Loaded {inserted} posts into Silver "
        f"(offset={args.offset}, limit={args.limit}, batch_size={args.batch_size}, workers={args.workers})"
    )


def cmd_gl_run_agents(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    prompts_dir = Path("rel/silver_gold/prompts")

    with Database(db_url) as db:
        ensure_run(
            db,
            args.run_id,
            description="Agentic prediction run",
            analysis_type=args.analysis_type,
        )

        rows = db.fetchall(
            """
            SELECT p.canonical_post_id, p.text, p.platform, p.published_at,
                   COALESCE(array_agg(t.tag ORDER BY t.tag_id) FILTER (WHERE t.tag_id IS NOT NULL), '{}') AS hashtags
            FROM sl_posts p
            LEFT JOIN sl_post_tags pt ON pt.canonical_post_id = p.canonical_post_id
            LEFT JOIN sl_tags t ON t.tag_id = pt.tag_id AND t.tag_type = 'hashtag'
            GROUP BY p.canonical_post_id, p.text, p.platform, p.published_at
            ORDER BY p.published_at DESC
            LIMIT %s
            """,
            (args.limit,),
        )

        runner = AgentRunner(config=config, prompts_dir=prompts_dir)

        def _predict(row: Dict[str, Any]) -> tuple[str, str, Dict[str, Any]]:
            pred = runner.run_for_post(
                canonical_post_id=row["canonical_post_id"],
                text=row.get("text") or "",
                hashtags=row.get("hashtags") or [],
            )
            pred["analysis_type"] = args.analysis_type
            return (row["canonical_post_id"], args.run_id, pred)

        if args.workers > 1:
            with ThreadPoolExecutor(max_workers=args.workers) as ex:
                predicted_rows = list(ex.map(_predict, rows))
        else:
            predicted_rows = [_predict(r) for r in rows]

        upsert_predictions_bulk(db, predicted_rows, batch_size=args.batch_size)

    print(
        f"Agent predictions complete for run_id={args.run_id} "
        f"(posts={len(rows)}, workers={args.workers}, batch_size={args.batch_size})"
    )


def cmd_gl_compute_horizon(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        compute_horizon_metrics(db, run_id=args.run_id, horizon=args.horizon)
    print(f"Computed horizon metrics for run_id={args.run_id}, horizon={args.horizon}")


def cmd_gl_build_trends(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        build_trends_by_category(db, run_id=args.run_id, method=args.method)
    print(f"Built trend clusters for run_id={args.run_id}, method={args.method}")


def cmd_gl_aggregate_daily(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    share_threshold = float(config.get("thresholds", {}).get("share_threshold", 1000))
    breakout_z = float(config.get("thresholds", {}).get("breakout_z", 2.5))

    with Database(db_url) as db:
        aggregate_daily_trends(
            db,
            run_id=args.run_id,
            share_threshold=share_threshold,
            breakout_z=breakout_z,
        )
    print(f"Aggregated daily trends for run_id={args.run_id}")


def cmd_gl_rank_users(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        rank_users_daily(db, run_id=args.run_id)
    print(f"Ranked users for run_id={args.run_id}")


def cmd_gl_compute_trend_kpis(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        compute_trend_kpis(db, run_id=args.run_id)
    print(f"Computed trend KPI table for run_id={args.run_id}")


def cmd_gl_compute_content_kpis(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        compute_content_kpis(db, run_id=args.run_id)
    print(f"Computed content KPI table for run_id={args.run_id}")


def cmd_gl_rank_users_7d(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        compute_user_influence_7d(db, run_id=args.run_id)
    print(f"Computed 7d user influence tables for run_id={args.run_id}")


def cmd_gl_batch_prepare(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    model_name = (config.get("model") or {}).get("model_name", "gpt-5-nano")
    prompt_path = args.prompt or "rel/silver_gold/prompts/batch_enrich.md"
    out_path = args.out or "rel/silver_gold/pipeline/tmp/batch_input.jsonl"

    with Database(db_url) as db:
        count = prepare_batch_jsonl(
            db=db,
            run_id=args.run_id,
            out_path=out_path,
            prompt_path=prompt_path,
            model_name=model_name,
            offset=args.offset,
            limit=args.limit,
        )
    print(f"Prepared batch JSONL: {out_path} (offset={args.offset}, requests={count})")


def cmd_gl_batch_submit(args: argparse.Namespace) -> None:
    batch_id = submit_batch(args.input_jsonl, completion_window=args.completion_window)
    print(f"Submitted batch: {batch_id}")


def cmd_gl_batch_status(args: argparse.Namespace) -> None:
    status = get_batch_status(args.batch_id)
    print(status)


def cmd_gl_batch_download(args: argparse.Namespace) -> None:
    out = download_batch_output(args.batch_id, args.out_jsonl)
    print(f"Downloaded batch output to: {out}")


def cmd_gl_batch_ingest(args: argparse.Namespace) -> None:
    config = load_config(args.config)
    db_url = resolve_db_url(config)
    with Database(db_url) as db:
        count = ingest_batch_output(db, run_id=args.run_id, output_jsonl_path=args.output_jsonl)
    print(f"Ingested batch predictions: {count} rows into gl_post_predictions")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Silver/Gold social trend mining pipeline")
    parser.add_argument("--config", default=None, help="Path to YAML config")

    sub = parser.add_subparsers(dest="command", required=True)

    p_sl = sub.add_parser("sl_load", help="Load Bronze JSONL into Silver")
    p_sl.add_argument("--platform", required=True, choices=["instagram"], help="Source platform")
    p_sl.add_argument("--jsonl", required=True, help="Path to Bronze JSONL file")
    p_sl.add_argument("--offset", type=int, default=0, help="Start offset in JSONL stream")
    p_sl.add_argument("--limit", type=int, default=None, help="Max posts to process this run")
    p_sl.add_argument("--batch-size", type=int, default=500, help="Commit every N posts")
    p_sl.add_argument("--workers", type=int, default=4, help="Local parallel transform workers")
    p_sl.add_argument("--no-progress", action="store_true", help="Disable progress bar")
    p_sl.set_defaults(func=cmd_sl_load)

    p_agents = sub.add_parser("gl_run_agents", help="Run agentic detection and write Gold predictions")
    p_agents.add_argument("--run-id", required=True, help="Gold run identifier")
    p_agents.add_argument("--limit", type=int, default=1000, help="Max posts to score")
    p_agents.add_argument("--workers", type=int, default=8, help="Parallel workers for agent processing")
    p_agents.add_argument("--batch-size", type=int, default=500, help="Bulk upsert batch size")
    p_agents.add_argument("--analysis-type", default="heuristic", choices=["heuristic", "ai"])
    p_agents.set_defaults(func=cmd_gl_run_agents)

    p_h = sub.add_parser("gl_compute_horizon", help="Compute horizon metrics")
    p_h.add_argument("--run-id", required=True)
    p_h.add_argument("--horizon", default="d7", choices=["d7", "d30"])
    p_h.set_defaults(func=cmd_gl_compute_horizon)

    p_bt = sub.add_parser("gl_build_trends", help="Build trend clusters")
    p_bt.add_argument("--run-id", required=True)
    p_bt.add_argument("--method", default="category_group", choices=["category_group"])
    p_bt.set_defaults(func=cmd_gl_build_trends)

    p_ag = sub.add_parser("gl_aggregate_daily", help="Aggregate cluster metrics per day")
    p_ag.add_argument("--run-id", required=True)
    p_ag.set_defaults(func=cmd_gl_aggregate_daily)

    p_rank = sub.add_parser("gl_rank_users", help="Rank users by daily influence")
    p_rank.add_argument("--run-id", required=True)
    p_rank.set_defaults(func=cmd_gl_rank_users)

    p_tk = sub.add_parser("gl_compute_trend_kpis", help="Compute trend KPI table")
    p_tk.add_argument("--run-id", required=True)
    p_tk.set_defaults(func=cmd_gl_compute_trend_kpis)

    p_ck = sub.add_parser("gl_compute_content_kpis", help="Compute content/performance KPI table")
    p_ck.add_argument("--run-id", required=True)
    p_ck.set_defaults(func=cmd_gl_compute_content_kpis)

    p_u7 = sub.add_parser("gl_rank_users_7d", help="Compute 7-day user influence overall and by category")
    p_u7.add_argument("--run-id", required=True)
    p_u7.set_defaults(func=cmd_gl_rank_users_7d)

    p_bp = sub.add_parser("gl_batch_prepare", help="Prepare OpenAI Batch JSONL from Silver posts")
    p_bp.add_argument("--run-id", required=True)
    p_bp.add_argument("--offset", type=int, default=0)
    p_bp.add_argument("--limit", type=int, default=5000)
    p_bp.add_argument("--prompt", default=None, help="Prompt template path")
    p_bp.add_argument("--out", default=None, help="Output JSONL path")
    p_bp.set_defaults(func=cmd_gl_batch_prepare)

    p_bs = sub.add_parser("gl_batch_submit", help="Submit prepared JSONL to OpenAI Batch API")
    p_bs.add_argument("--input-jsonl", required=True)
    p_bs.add_argument("--completion-window", default="24h")
    p_bs.set_defaults(func=cmd_gl_batch_submit)

    p_bst = sub.add_parser("gl_batch_status", help="Check OpenAI Batch status")
    p_bst.add_argument("--batch-id", required=True)
    p_bst.set_defaults(func=cmd_gl_batch_status)

    p_bd = sub.add_parser("gl_batch_download", help="Download OpenAI Batch output JSONL")
    p_bd.add_argument("--batch-id", required=True)
    p_bd.add_argument("--out-jsonl", default="rel/silver_gold/pipeline/tmp/batch_output.jsonl")
    p_bd.set_defaults(func=cmd_gl_batch_download)

    p_bi = sub.add_parser("gl_batch_ingest", help="Ingest downloaded batch output into Gold predictions")
    p_bi.add_argument("--run-id", required=True)
    p_bi.add_argument("--output-jsonl", required=True)
    p_bi.set_defaults(func=cmd_gl_batch_ingest)

    return parser


def main() -> None:
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
