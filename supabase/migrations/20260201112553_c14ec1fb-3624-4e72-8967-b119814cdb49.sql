-- Add top_celebrities section to home_sections
INSERT INTO home_sections (section_key, section_name, is_visible, display_order)
VALUES ('top_celebrities', 'Top Celebrities', true, 8)
ON CONFLICT (section_key) DO UPDATE SET section_name = EXCLUDED.section_name;