-- Migration: Restructure JobReport for per-job reports with approval workflow
DROP TABLE IF EXISTS "JobReport";

CREATE TABLE "JobReport" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE,
  wage_rate text NOT NULL DEFAULT '',
  kilometers text,
  tools text,
  meals text,
  overtime text,
  notes text,
  status text NOT NULL DEFAULT 'NEW',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- RLS policies
ALTER TABLE "JobReport" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON "JobReport" FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_manager_or_admin());

CREATE POLICY "Users can insert own reports"
  ON "JobReport" FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own non-accepted reports"
  ON "JobReport" FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status != 'ACCEPTED')
    OR is_manager_or_admin()
  );
