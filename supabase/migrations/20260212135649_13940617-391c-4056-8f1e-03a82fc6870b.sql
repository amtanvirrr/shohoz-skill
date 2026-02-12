
-- Add courier tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_tracking_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_consignment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_sent_at timestamptz;
