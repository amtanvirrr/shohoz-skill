
-- Add transaction ID and payment verification to orders
ALTER TABLE public.orders ADD COLUMN transaction_id text;
ALTER TABLE public.orders ADD COLUMN payment_verified boolean NOT NULL DEFAULT false;
