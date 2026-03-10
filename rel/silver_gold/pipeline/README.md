# Silver + Gold Pipeline (Supabase/Postgres)

This pipeline keeps Bronze local and writes Silver/Gold layers to Supabase Postgres.

## Data Layers

- Bronze local: `rel/bronze/ig/raw/` (JSONL source files)
- Silver in Supabase: `sl_*` normalized ingestion tables
- Gold in Supabase: `gl_*` model outputs, trend clusters, and aggregates

## Setup

1. Apply SQL migrations in `rel/silver_gold/supabase/migrations/` to your Supabase Postgres.
2. Create a virtualenv and install dependencies:
   - `pip install -r rel/silver_gold/pipeline/requirements.txt`
3. Provide DB connection via `db.url` in config or env (`DATABASE_URL` / `SUPABASE_DB_URL`).
4. Copy `config.example.yaml` and adjust values.
5. Default model config is set to `gpt-5-nano` with Batch API fields enabled for low-cost runs.

## Commands

- Load Bronze JSONL into Silver:
  - `python rel/silver_gold/pipeline/cli.py sl_load --platform instagram --jsonl rel/bronze/ig/raw/ig_posts_6mo_5000_mix.jsonl`
- Run agentic inference into Gold predictions:
  - `python rel/silver_gold/pipeline/cli.py gl_run_agents --run-id run_20260309_1200 --limit 500`
- Compute horizon metrics (e.g. d7):
  - `python rel/silver_gold/pipeline/cli.py gl_compute_horizon --run-id run_20260309_1200 --horizon d7`
- Build trend clusters (MVP category grouping):
  - `python rel/silver_gold/pipeline/cli.py gl_build_trends --run-id run_20260309_1200 --method category_group`
- Aggregate trend daily metrics:
  - `python rel/silver_gold/pipeline/cli.py gl_aggregate_daily --run-id run_20260309_1200`
- Rank users daily:
  - `python rel/silver_gold/pipeline/cli.py gl_rank_users --run-id run_20260309_1200`

## Notes

- Silver must remain raw/normalized only; derived fields stay in Gold.
- Agent calls are optional: you can use `run.precomputed_predictions_path` for offline/pregenerated outputs.
- Prompt templates used by agent stages are in `rel/silver_gold/prompts/` and are intentionally lean for low token usage.
- Batch API mode is configured in `model.use_batch_api` and related `batch_*` paths in `config.example.yaml`.
- Use UTC timestamps across all stages.
- Inspect results in Supabase tables `sl_*` and `gl_*`.
