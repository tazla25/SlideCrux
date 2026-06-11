-- 004_rename_brand_kit_colors.sql
-- Rename color columns to match React app fields

ALTER TABLE public.brand_kits RENAME COLUMN color_primary TO primary_color;
ALTER TABLE public.brand_kits RENAME COLUMN color_secondary TO secondary_color;
ALTER TABLE public.brand_kits RENAME COLUMN color_accent TO accent_color;

-- Update constraint names to keep them clean
ALTER TABLE public.brand_kits DROP CONSTRAINT IF EXISTS brand_kits_color_primary_check;
ALTER TABLE public.brand_kits DROP CONSTRAINT IF EXISTS brand_kits_color_secondary_check;
ALTER TABLE public.brand_kits DROP CONSTRAINT IF EXISTS brand_kits_color_accent_check;

ALTER TABLE public.brand_kits ADD CONSTRAINT brand_kits_primary_color_check CHECK (primary_color ~ '^#[0-9a-fA-F]{3,8}$');
ALTER TABLE public.brand_kits ADD CONSTRAINT brand_kits_secondary_color_check CHECK (secondary_color ~ '^#[0-9a-fA-F]{3,8}$');
ALTER TABLE public.brand_kits ADD CONSTRAINT brand_kits_accent_color_check CHECK (accent_color ~ '^#[0-9a-fA-F]{3,8}$');
