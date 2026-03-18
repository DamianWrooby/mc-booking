---
date: 2026-03-12T00:00:00Z
researcher: Claude
topic: "Job Reports Feature - Codebase Analysis"
tags: [research, codebase, job-reports, database, angular]
status: complete
---

# Research: Job Reports Feature

## Research Question
Understand existing patterns and schema to implement job reports feature: employee report submission, manager/admin review, and acceptance workflow.

## Summary
- A `JobReport` table already exists but has a different schema (per-day time tracking: `job_day_id`, `hours_worked`, `hourly_rate`, `notes`). It needs to be restructured to match the new requirements (per-job reports with wage rate, kilometers, tools, meals, overtime, status).
- No `JobReportService` exists yet in the frontend — the table/types exist but are unused.
- DTO and Command types for `JobReport` already exist but need updating to match new schema.
- Card layout pattern is inline HTML in `job-list-page` and `my-jobs-page` — no shared card component.

## Database Changes Required

### Option: ALTER existing `JobReport` table
Since it's unused in production, the cleanest approach is to drop and recreate:

```sql
-- Migration: Restructure JobReport for job-level reports with approval workflow
DROP TABLE IF EXISTS "JobReport";

CREATE TABLE "JobReport" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE,
  wage_rate numeric NOT NULL DEFAULT 1.0,        -- 1.0, 1.3, 1.5
  kilometers numeric DEFAULT 0,                   -- km driven
  tools numeric DEFAULT 0,                        -- tool cost addition
  meals numeric DEFAULT 0,                        -- meal allowance
  overtime numeric DEFAULT 0,                     -- overtime hours
  notes text,                                     -- additional notes
  status text NOT NULL DEFAULT 'NEW',             -- NEW, SUBMITTED, ACCEPTED
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)                         -- one report per user per job
);

-- RLS policies
ALTER TABLE "JobReport" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON "JobReport"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_manager_or_admin());

CREATE POLICY "Users can insert own reports" ON "JobReport"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own non-accepted reports" ON "JobReport"
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status != 'ACCEPTED')
    OR is_manager_or_admin()
  );

CREATE POLICY "Managers can view all reports" ON "JobReport"
  FOR SELECT TO authenticated
  USING (is_manager_or_admin());
```

## TypeScript Changes Required
1. `database.types.ts` — update JobReport Row/Insert/Update types
2. `dto.types.ts` — update JobReportDto composites
3. `command.types.ts` — update JobReport commands

## Frontend Implementation
1. New `JobReportService` (signal state pattern)
2. New `/reports` page (employee view: my completed jobs with report status)
3. New `/reports-review` page (manager/admin view: all submitted reports)
4. Job report form (dialog or inline)
5. Routes with guards
6. Bottom nav entry

## Code References
- `src/app/supabase/database.types.ts:174-218` — Current JobReport schema
- `src/app/types/dto.types.ts:29-63` — JobReport DTOs
- `src/app/types/command.types.ts:113-130` — JobReport commands
- `src/app/components/job-list-page/job-list-page.html` — Card layout pattern
- `src/app/services/availability/availability.service.ts` — Service pattern reference
- `src/app/components/availability-page/` — Form pattern reference
- `src/app/app.routes.ts` — Route configuration
- `src/app/components/bottom-nav/` — Navigation menu
