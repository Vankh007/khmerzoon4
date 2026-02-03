-- Add is_pinned column to content table
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Add pinned_series_visible to home_sections if not exists
INSERT INTO public.home_sections (section_key, section_name, display_order, is_visible)
VALUES ('pinned_series', 'Pinned Series', 5, true)
ON CONFLICT (section_key) DO NOTHING;