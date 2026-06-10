-- 003_brand_kits.sql
-- Updates the existing brand_kits table

-- Add updated_at column to public.brand_kits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'brand_kits'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.brand_kits
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_brand_kits_updated_at ON public.brand_kits;

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
