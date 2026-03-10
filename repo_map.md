# Repository Map

Last updated: 2026-03-09
Source: `codegraph` MCP (required)

## Full Structure

```text
.
├── .git/
├── .gitignore
├── agent.md
├── rel/
│   ├── bronze/
│   │   └── ig/
│   │       └── raw/
│   │           └── .gitkeep
│   ├── data/
│   │   └── ig/
│   │       └── raw/
│   │           └── .gitkeep
│   ├── docs/
│   │   └── README.md
│   ├── prompts/
│   │   ├── data_analysis.txt
│   │   └── ig_synth_v3_prompt.txt
│   └── silver_gold/
│       ├── pipeline/
│       │   ├── README.md
│       │   ├── cli.py
│       │   ├── config.example.yaml
│       │   ├── lib/
│       │   │   ├── __init__.py
│       │   │   ├── agents.py
│       │   │   ├── bronze_reader.py
│       │   │   ├── batch_jobs.py
│       │   │   ├── db.py
│       │   │   ├── gl_writer.py
│       │   │   ├── kpi_agg.py
│       │   │   ├── sl_loader.py
│       │   │   ├── trend_agg.py
│       │   │   └── utils.py
│       │   └── requirements.txt
│       ├── prompts/
│       │   ├── batch_enrich.md
│       │   ├── category_detect.md
│       │   ├── fashion_detect.md
│       │   ├── lang_detect.md
│       │   ├── sentiment.md
│       │   ├── topic_summary.md
│       │   └── translate_en.md
│       └── supabase/
│           └── migrations/
│               ├── 0001_sl_core.sql
│               ├── 0002_gl_predictions.sql
│               ├── 0003_gl_trends.sql
│               ├── 0004_add_analysis_type_to_gl.sql
│               ├── 0005_add_breakout_streak_metrics.sql
│               └── 0006_add_gl_kpi_tables.sql
├── supabase/
│   └── migrations/
│       ├── 20260309000100_sl_core.sql
│       ├── 20260309000200_gl_predictions.sql
│       ├── 20260309000300_gl_trends.sql
│       ├── 20260309000400_cleanup_heuristic_runs.sql
│       ├── 20260310000100_add_analysis_type_to_gl.sql
│       ├── 20260310000200_add_breakout_streak_metrics.sql
│       └── 20260310000300_add_gl_kpi_tables.sql
└── repo_map.md
```

## Notes

- This file must be generated/updated using the `codegraph` MCP server.
- Current content is a bootstrap map created before `codegraph` became available in this session.
