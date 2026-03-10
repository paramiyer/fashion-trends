CREATE TABLE IF NOT EXISTS gl_runs (
  run_id text PRIMARY KEY,
  description text,
  analysis_type text NOT NULL DEFAULT 'heuristic' CHECK (analysis_type IN ('heuristic', 'ai')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_post_predictions (
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  pred_is_fashion boolean,
  pred_is_fashion_conf real,
  pred_language text,
  pred_language_conf real,
  translation_en text,
  translation_model text,
  sentiment text,
  sentiment_conf real,
  topic_summary text,
  category text,
  category_conf real,
  subcategory text,
  subcategory_conf real,
  analysis_type text NOT NULL DEFAULT 'heuristic' CHECK (analysis_type IN ('heuristic', 'ai')),
  evidence jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (canonical_post_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_gl_post_predictions_run_fashion
  ON gl_post_predictions (run_id, pred_is_fashion);

CREATE INDEX IF NOT EXISTS idx_gl_post_predictions_run_category
  ON gl_post_predictions (run_id, category);

CREATE INDEX IF NOT EXISTS idx_gl_post_predictions_run_sentiment
  ON gl_post_predictions (run_id, sentiment);

CREATE TABLE IF NOT EXISTS gl_post_metrics_horizon (
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  horizon_type text NOT NULL,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  views bigint,
  followers_at_post integer,
  engagement_score real,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (canonical_post_id, run_id, horizon_type)
);
