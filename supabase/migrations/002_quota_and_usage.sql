-- 002_quota_and_usage.sql
-- Adds: monthly quota tracking to profiles, usage_log table, and monthly reset function

-- 1. Add quota tracking columns to profiles (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'decks_this_month'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN decks_this_month int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'monthly_reset_at'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN monthly_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'lemon_customer_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN lemon_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'plan_renews_at'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN plan_renews_at timestamptz;
  END IF;
END $$;


-- 2. Create usage_log table
CREATE TABLE IF NOT EXISTS public.usage_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deck_id uuid REFERENCES public.decks(id) ON DELETE SET NULL,
  transcript_seconds int DEFAULT 0,
  llm_tokens_in int DEFAULT 0,
  llm_tokens_out int DEFAULT 0,
  cost_usd_micros bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on usage_log
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage logs
CREATE POLICY "Users can read own usage"
  ON public.usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Index for efficient user usage queries
CREATE INDEX IF NOT EXISTS usage_user_created_idx
  ON public.usage_log (user_id, created_at DESC);


-- 3. Monthly quota reset function (run via pg_cron daily at 00:10 UTC)
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profiles
  SET decks_this_month = 0,
      monthly_reset_at = date_trunc('month', now()) + interval '1 month'
  WHERE monthly_reset_at <= now();
$$;

-- Schedule with pg_cron (will silently fail if pg_cron not enabled — that's OK for dev)
DO $$
BEGIN
  PERFORM cron.schedule(
    'reset-quotas',
    '10 0 * * *',
    'SELECT public.reset_monthly_quotas()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — skip scheduling reset_monthly_quotas. Set up manually in production.';
END $$;
