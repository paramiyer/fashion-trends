BEGIN;

ALTER TABLE gl_trend_daily_metrics
  ADD COLUMN IF NOT EXISTS breakout_streak integer;

ALTER TABLE gl_trend_daily_metrics
  ADD COLUMN IF NOT EXISTS longest_breakout_streak integer;

COMMIT;
