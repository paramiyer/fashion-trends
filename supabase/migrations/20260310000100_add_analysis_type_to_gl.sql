BEGIN;

ALTER TABLE gl_runs
  ADD COLUMN IF NOT EXISTS analysis_type text;

ALTER TABLE gl_runs
  ALTER COLUMN analysis_type SET DEFAULT 'heuristic';

UPDATE gl_runs
SET analysis_type = COALESCE(analysis_type, 'heuristic')
WHERE analysis_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gl_runs_analysis_type_chk'
  ) THEN
    ALTER TABLE gl_runs
      ADD CONSTRAINT gl_runs_analysis_type_chk
      CHECK (analysis_type IN ('heuristic', 'ai'));
  END IF;
END $$;

ALTER TABLE gl_runs
  ALTER COLUMN analysis_type SET NOT NULL;

ALTER TABLE gl_post_predictions
  ADD COLUMN IF NOT EXISTS analysis_type text;

ALTER TABLE gl_post_predictions
  ALTER COLUMN analysis_type SET DEFAULT 'heuristic';

UPDATE gl_post_predictions
SET analysis_type = COALESCE(analysis_type, 'heuristic')
WHERE analysis_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gl_post_predictions_analysis_type_chk'
  ) THEN
    ALTER TABLE gl_post_predictions
      ADD CONSTRAINT gl_post_predictions_analysis_type_chk
      CHECK (analysis_type IN ('heuristic', 'ai'));
  END IF;
END $$;

ALTER TABLE gl_post_predictions
  ALTER COLUMN analysis_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gl_post_predictions_run_analysis_type
  ON gl_post_predictions (run_id, analysis_type);

COMMIT;
