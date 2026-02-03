-- Add separate visibility columns for web and mobile
ALTER TABLE public.home_sections 
ADD COLUMN IF NOT EXISTS is_visible_web boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_visible_mobile boolean NOT NULL DEFAULT true;

-- Migrate existing data
UPDATE public.home_sections SET is_visible_web = is_visible, is_visible_mobile = is_visible;