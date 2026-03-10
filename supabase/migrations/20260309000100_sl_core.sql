CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.normalize_tag(input_tag text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(COALESCE(input_tag, '')));
$$;

CREATE OR REPLACE FUNCTION public.metric_time_key(
  p_metric_time_type text,
  p_t_day smallint,
  p_asof_date date
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_metric_time_type = 'age_day'
      THEN 'd:' || COALESCE(p_t_day::int, -1)::text
    ELSE
      'a:' || COALESCE((p_asof_date - DATE '1970-01-01')::int, -1)::text
  END;
$$;

CREATE TABLE IF NOT EXISTS sl_users (
  canonical_user_id text PRIMARY KEY,
  platform text NOT NULL,
  native_user_id text NOT NULL,
  handle text,
  display_name text,
  account_type text,
  verified boolean,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  UNIQUE (platform, native_user_id)
);

CREATE TABLE IF NOT EXISTS sl_user_snapshots (
  canonical_user_id text REFERENCES sl_users(canonical_user_id),
  snapshot_date date NOT NULL,
  followers_count integer,
  following_count integer,
  posts_count integer,
  snapshot_source text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (canonical_user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sl_posts (
  canonical_post_id text PRIMARY KEY,
  platform text NOT NULL,
  native_post_id text NOT NULL,
  canonical_user_id text REFERENCES sl_users(canonical_user_id),
  published_at timestamptz NOT NULL,
  content_type text NOT NULL,
  text text,
  ingest_batch_id text,
  ingest_date timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (platform, native_post_id)
);

CREATE TABLE IF NOT EXISTS sl_post_mentions (
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  mentioned_handle text NOT NULL,
  PRIMARY KEY (canonical_post_id, mentioned_handle)
);

CREATE TABLE IF NOT EXISTS sl_tags (
  tag_id bigserial PRIMARY KEY,
  tag_type text NOT NULL,
  tag text NOT NULL,
  tag_norm text NOT NULL,
  script text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tag_type, tag_norm)
);

CREATE TABLE IF NOT EXISTS sl_post_tags (
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  tag_id bigint REFERENCES sl_tags(tag_id) ON DELETE CASCADE,
  position smallint,
  PRIMARY KEY (canonical_post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS sl_post_metrics_ts (
  canonical_post_id text REFERENCES sl_posts(canonical_post_id) ON DELETE CASCADE,
  metric_time_type text NOT NULL CHECK (metric_time_type IN ('age_day', 'asof_date')),
  t_day smallint,
  asof_date date,
  metric_time_key text GENERATED ALWAYS AS (
    public.metric_time_key(metric_time_type, t_day, asof_date)
  ) STORED,
  likes_total bigint,
  comments_total bigint,
  shares_total bigint,
  saves_total bigint,
  views_total bigint,
  reposts_total bigint,
  collected_at timestamptz DEFAULT now(),
  CHECK (
    (metric_time_type = 'age_day' AND t_day IS NOT NULL AND asof_date IS NULL)
    OR (metric_time_type = 'asof_date' AND asof_date IS NOT NULL AND t_day IS NULL)
  ),
  PRIMARY KEY (canonical_post_id, metric_time_type, metric_time_key)
);

CREATE INDEX IF NOT EXISTS idx_sl_posts_published_at
  ON sl_posts (published_at);

CREATE INDEX IF NOT EXISTS idx_sl_posts_user_published_at
  ON sl_posts (canonical_user_id, published_at);

CREATE INDEX IF NOT EXISTS idx_sl_post_metrics_ts_age_day
  ON sl_post_metrics_ts (metric_time_type, t_day);

CREATE INDEX IF NOT EXISTS idx_sl_post_metrics_ts_asof_date
  ON sl_post_metrics_ts (metric_time_type, asof_date);

CREATE INDEX IF NOT EXISTS idx_sl_post_tags_tag_id
  ON sl_post_tags (tag_id);
