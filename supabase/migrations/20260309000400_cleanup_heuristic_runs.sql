-- Remove heuristic/test Gold run outputs while keeping Silver data intact.
-- Safe to rerun: DELETE statements are idempotent.

BEGIN;

DELETE FROM gl_user_influence_daily
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_trend_daily_metrics
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_post_cluster_membership
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_trend_clusters
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_post_metrics_horizon
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_post_predictions
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

DELETE FROM gl_runs
WHERE run_id IN (
  'run_20260309_gold1',
  'run_20260309_prompttest',
  'run_20260309_prompttest2'
);

COMMIT;
