ALTER TABLE "JobReport"
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN accepted_at timestamptz;
