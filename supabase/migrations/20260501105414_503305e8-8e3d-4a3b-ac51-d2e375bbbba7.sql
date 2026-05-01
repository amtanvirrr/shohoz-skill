
-- Add SSLCOMMERZ to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'sslcommerz';

-- Add gateway tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gateway_session_key text,
  ADD COLUMN IF NOT EXISTS gateway_tran_id text,
  ADD COLUMN IF NOT EXISTS gateway_val_id text,
  ADD COLUMN IF NOT EXISTS gateway_response jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_gateway_tran_id ON public.orders(gateway_tran_id);
