CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS gl_trend_clusters (
  cluster_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  platform_scope text DEFAULT 'all',
  cluster_method text NOT NULL,
  label_hint text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gl_post_cluster_membership (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES gl_trend_clusters(cluster_id) ON DELETE CASCADE,
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  score real,
  PRIMARY KEY (run_id, cluster_id, canonical_post_id)
);

CREATE TABLE IF NOT EXISTS gl_trend_daily_metrics (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  date_utc date NOT NULL,
  cluster_id uuid REFERENCES gl_trend_clusters(cluster_id) ON DELETE CASCADE,
  platform text,
  region text,
  platform_key text GENERATED ALWAYS AS (COALESCE(platform, '')) STORED,
  region_key text GENERATED ALWAYS AS (COALESCE(region, '')) STORED,
  post_count integer NOT NULL,
  unique_authors integer NOT NULL,
  engagement_score_sum real,
  engagement_score_avg real,
  shares_sum bigint,
  velocity_7d real,
  acceleration_7d real,
  breakout_score real,
  threshold_hit boolean,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, date_utc, cluster_id, platform_key, region_key)
);

CREATE TABLE IF NOT EXISTS gl_user_influence_daily (
  run_id text REFERENCES gl_runs(run_id) ON DELETE CASCADE,
  date_utc date NOT NULL,
  canonical_user_id text REFERENCES sl_users(canonical_user_id) ON DELETE CASCADE,
  posts_count integer,
  engagement_score_sum real,
  avg_engagement_score real,
  followers_est integer,
  influence_score real,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, date_utc, canonical_user_id)
);
