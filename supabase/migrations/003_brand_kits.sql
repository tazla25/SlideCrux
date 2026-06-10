-- 003_brand_kits.sql
-- Creates the brand_kits table and RLS policies

CREATE TABLE IF NOT EXISTS public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  primary_color text NOT NULL DEFAULT '#3b82f6',
  secondary_color text NOT NULL DEFAULT '#1f2937',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  font_family text NOT NULL DEFAULT 'Inter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own brand kits"
  ON public.brand_kits FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own brand kits"
  ON public.brand_kits FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own brand kits"
  ON public.brand_kits FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own brand kits"
  ON public.brand_kits FOR DELETE
  USING (auth.uid() = owner_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
