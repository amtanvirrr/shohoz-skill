
-- Hero slides table for images/videos
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_url TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'video'
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hero slides"
  ON public.hero_slides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active hero slides"
  ON public.hero_slides FOR SELECT
  USING (is_active = true);

-- Insert default hero settings into site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_title', 'শেখার নতুন দিগন্ত — কোর্স ও বই এক জায়গায়'),
  ('hero_subtitle', 'প্রফেশনাল কোর্স, হ্যান্ডপিকড বই এবং কোয়ালিটি কন্টেন্ট দিয়ে আপনার স্কিল ডেভেলপ করুন।'),
  ('hero_btn1_text', 'Explore Courses'),
  ('hero_btn1_link', '/courses'),
  ('hero_btn2_text', 'Browse Books'),
  ('hero_btn2_link', '/books'),
  ('hero_stat1_value', '5,000+'),
  ('hero_stat1_label', 'Students'),
  ('hero_stat2_value', '50+'),
  ('hero_stat2_label', 'Books'),
  ('hero_stat3_value', '30+'),
  ('hero_stat3_label', 'Courses')
ON CONFLICT DO NOTHING;
