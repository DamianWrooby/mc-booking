-- Create PushSubscription table for Web Push notification endpoints
CREATE TABLE IF NOT EXISTS public."PushSubscription" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public."Profile"(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Enable Row Level Security
ALTER TABLE public."PushSubscription" ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public."PushSubscription"
    FOR ALL USING (auth.uid() = user_id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_push_subscription_user_id
ON public."PushSubscription"(user_id);
