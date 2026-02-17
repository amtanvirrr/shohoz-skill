
-- Landing pages table for product landing page builder
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'book',
  theme TEXT NOT NULL DEFAULT 'classic',
  headline TEXT NOT NULL DEFAULT '',
  subheadline TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT DEFAULT '',
  hero_video_url TEXT DEFAULT '',
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_text TEXT NOT NULL DEFAULT 'এখনই অর্ডার করুন',
  cta_color TEXT NOT NULL DEFAULT '#e11d48',
  show_quantity BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage landing pages"
ON public.landing_pages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view published
CREATE POLICY "Anyone can view published landing pages"
ON public.landing_pages FOR SELECT
USING (is_published = true);

-- Updated at trigger
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
