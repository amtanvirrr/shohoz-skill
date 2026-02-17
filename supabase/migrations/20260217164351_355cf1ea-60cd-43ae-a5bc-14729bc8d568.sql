
ALTER TABLE public.landing_pages
  ADD COLUMN section_order jsonb NOT NULL DEFAULT '["hero","benefits","media_gallery","reviews","order_form","faqs","final_cta"]'::jsonb;
