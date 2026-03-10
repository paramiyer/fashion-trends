BEGIN;

CREATE TABLE IF NOT EXISTS gl_trend_kpis_daily (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('heuristic','ai')),
  date_utc date NOT NULL,
  cluster_id uuid REFERENCES gl_trend_clusters(cluster_id) ON DELETE CASCADE,
  category text,
  post_count integer,
  unique_authors integer,
  engagement_score_sum real,
  engagement_score_avg real,
  shares_sum bigint,
  breakout_score real,
  threshold_hit boolean,
  breakout_days_30d integer,
  breakout_streak integer,
  longest_breakout_streak integer,
  time_to_breakout_days integer,
  post_growth_7d real,
  engagement_growth_7d real,
  author_concentration_top10 real,
  novelty_score_7d real,
  stability_score_14d real,
  trend_health_index real,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, date_utc, cluster_id)
);

CREATE TABLE IF NOT EXISTS gl_content_kpis_daily (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('heuristic','ai')),
  date_utc date NOT NULL,
  category text NOT NULL,
  posts_count integer,
  likes_sum bigint,
  comments_sum bigint,
  shares_sum bigint,
  saves_sum bigint,
  views_sum bigint,
  followers_sum bigint,
  engagement_sum real,
  like_rate_per_1k real,
  comment_rate_per_1k real,
  share_rate_per_1k real,
  save_rate_per_1k real,
  engagement_quality_score real,
  viral_ratio real,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, date_utc, category)
);

CREATE TABLE IF NOT EXISTS gl_user_influence_7d_overall (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('heuristic','ai')),
  window_end_date date NOT NULL,
  canonical_user_id text REFERENCES sl_users(canonical_user_id) ON DELETE CASCADE,
  posts_7d integer,
  engagement_sum_7d real,
  avg_engagement_7d real,
  followers_est integer,
  influence_score_7d real,
  rank_overall integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, window_end_date, canonical_user_id)
);

CREATE TABLE IF NOT EXISTS gl_user_influence_7d_by_category (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('heuristic','ai')),
  window_end_date date NOT NULL,
  category text NOT NULL,
  canonical_user_id text REFERENCES sl_users(canonical_user_id) ON DELETE CASCADE,
  posts_7d integer,
  engagement_sum_7d real,
  avg_engagement_7d real,
  followers_est integer,
  influence_score_7d real,
  rank_in_category integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, window_end_date, category, canonical_user_id)
);

CREATE INDEX IF NOT EXISTS idx_gl_trend_kpis_daily_run_category
  ON gl_trend_kpis_daily (run_id, category, date_utc);

CREATE INDEX IF NOT EXISTS idx_gl_content_kpis_daily_run_category
  ON gl_content_kpis_daily (run_id, category, date_utc);

CREATE INDEX IF NOT EXISTS idx_gl_user_influence_7d_overall_rank
  ON gl_user_influence_7d_overall (run_id, window_end_date, rank_overall);

CREATE INDEX IF NOT EXISTS idx_gl_user_influence_7d_by_category_rank
  ON gl_user_influence_7d_by_category (run_id, category, window_end_date, rank_in_category);

COMMIT;
