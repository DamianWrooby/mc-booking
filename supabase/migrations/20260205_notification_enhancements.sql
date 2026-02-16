-- Add type and job_id columns to Notification table
ALTER TABLE public."Notification"
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public."Job"(id) ON DELETE SET NULL;

-- Create index for efficient unread notification queries
CREATE INDEX IF NOT EXISTS idx_notification_user_unread
ON public."Notification"(user_id, is_read) WHERE is_read = false;

-- Create index for job_id lookups
CREATE INDEX IF NOT EXISTS idx_notification_job_id
ON public."Notification"(job_id) WHERE job_id IS NOT NULL;
