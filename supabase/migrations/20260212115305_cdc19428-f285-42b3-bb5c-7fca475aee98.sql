
-- Payment methods configuration table for MFS (Mobile Financial Services)
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL, -- bkash, nagad, rocket, upay
  display_name text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  qr_code_url text,
  mfs_type text NOT NULL DEFAULT 'personal', -- personal, agent, merchant
  payment_instruction text NOT NULL DEFAULT '',
  process_message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment methods"
ON public.payment_methods FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active payment methods"
ON public.payment_methods FOR SELECT
USING (is_active = true);

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update payment_method enum to include rocket and upay
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'rocket';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'upay';
