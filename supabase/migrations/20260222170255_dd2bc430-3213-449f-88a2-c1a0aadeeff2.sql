
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS hidden_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_coupon boolean NOT NULL DEFAULT true;
