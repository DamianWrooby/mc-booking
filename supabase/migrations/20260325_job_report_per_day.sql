-- Migration: Add per-day entries to job reports
-- wage_rate and tools move from JobReport to JobReportDay (per-day granularity)
-- kilometers, meals, overtime, notes stay on JobReport (event-level)

-- 1. Create JobReportDay table
CREATE TABLE "JobReportDay" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES "JobReport"(id) ON DELETE CASCADE,
  date date NOT NULL,
  wage_rate text NOT NULL DEFAULT '',
  tools text,
  UNIQUE(report_id, date)
);

-- 2. Migrate existing data: create one day entry per report using Job start_date
INSERT INTO "JobReportDay" (report_id, date, wage_rate, tools)
SELECT jr.id, j.start_date::date, jr.wage_rate, jr.tools
FROM "JobReport" jr
JOIN "Job" j ON j.id = jr.job_id
WHERE jr.wage_rate != '' OR jr.tools IS NOT NULL;

-- 3. Remove per-day columns from JobReport
ALTER TABLE "JobReport" DROP COLUMN wage_rate;
ALTER TABLE "JobReport" DROP COLUMN tools;

-- 4. RLS policies for JobReportDay
ALTER TABLE "JobReportDay" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own report days"
  ON "JobReportDay" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "JobReport" jr
      WHERE jr.id = report_id
        AND (jr.user_id = auth.uid() OR is_manager_or_admin())
    )
  );

CREATE POLICY "Users can insert own report days"
  ON "JobReportDay" FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "JobReport" jr
      WHERE jr.id = report_id
        AND jr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own report days"
  ON "JobReportDay" FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "JobReport" jr
      WHERE jr.id = report_id
        AND (
          (jr.user_id = auth.uid() AND jr.status != 'ACCEPTED')
          OR is_manager_or_admin()
        )
    )
  );

CREATE POLICY "Users can delete own report days"
  ON "JobReportDay" FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "JobReport" jr
      WHERE jr.id = report_id
        AND (
          (jr.user_id = auth.uid() AND jr.status != 'ACCEPTED')
          OR is_manager_or_admin()
        )
    )
  );
