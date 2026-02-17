
-- Add urgency fields to landing_pages
ALTER TABLE public.landing_pages
  ADD COLUMN show_countdown boolean NOT NULL DEFAULT false,
  ADD COLUMN countdown_end_time timestamptz NULL,
  ADD COLUMN show_stock_badge boolean NOT NULL DEFAULT false,
  ADD COLUMN stock_limit integer NOT NULL DEFAULT 100,
  ADD COLUMN stock_sold integer NOT NULL DEFAULT 0;
