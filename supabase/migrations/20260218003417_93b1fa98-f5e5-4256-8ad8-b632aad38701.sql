
-- Add JSONB array columns for multiple hero images and videos
ALTER TABLE public.landing_pages 
  ADD COLUMN IF NOT EXISTS hero_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_videos JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single hero_image_url and hero_video_url data into the new arrays
UPDATE public.landing_pages 
SET hero_images = jsonb_build_array(hero_image_url)
WHERE hero_image_url IS NOT NULL AND hero_image_url != '' AND (hero_images IS NULL OR hero_images = '[]'::jsonb);

UPDATE public.landing_pages 
SET hero_videos = jsonb_build_array(hero_video_url)
WHERE hero_video_url IS NOT NULL AND hero_video_url != '' AND (hero_videos IS NULL OR hero_videos = '[]'::jsonb);
