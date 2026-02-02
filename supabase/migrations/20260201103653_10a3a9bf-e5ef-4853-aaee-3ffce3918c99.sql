-- Create home_sections table to store visibility settings
CREATE TABLE public.home_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key text UNIQUE NOT NULL,
    section_name text NOT NULL,
    is_visible boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view home sections (needed for home page)
CREATE POLICY "Anyone can view home sections"
ON public.home_sections
FOR SELECT
USING (true);

-- Only admins can manage home sections
CREATE POLICY "Admins can manage home sections"
ON public.home_sections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default sections
INSERT INTO public.home_sections (section_key, section_name, is_visible, display_order) VALUES
('hero_banner', 'Hero Banner', true, 1),
('circle_slider', 'Circle Slider (Mobile)', true, 2),
('continuous_watch', 'Continue Watching', true, 3),
('top_section', 'Top Section', true, 4),
('series_update_today', 'Series Update Today', true, 5),
('top_animes', 'Top Animes', true, 6),
('watch_history', 'Watch History', true, 7),
('top_movies', 'Top Movies', true, 8),
('upcoming', 'Upcoming', true, 9),
('collections', 'Collections', true, 10),
('trending', 'Trending Now', true, 11),
('new_releases', 'New Releases', true, 12);