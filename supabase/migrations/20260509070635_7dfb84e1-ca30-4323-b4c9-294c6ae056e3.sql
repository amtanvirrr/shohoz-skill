
CREATE TABLE public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  product_type text,
  product_id uuid,
  product_title text,
  price integer,
  payment_method text,
  event_type text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_created_at ON public.payment_events (created_at DESC);
CREATE INDEX idx_payment_events_event_type ON public.payment_events (event_type);
CREATE INDEX idx_payment_events_user_id ON public.payment_events (user_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment events"
ON public.payment_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment events"
ON public.payment_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert payment events"
ON public.payment_events FOR INSERT
WITH CHECK (true);
