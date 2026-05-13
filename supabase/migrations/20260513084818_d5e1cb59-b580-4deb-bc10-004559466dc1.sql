
CREATE TABLE public.cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  page text,
  section text,
  label text,
  target_url text,
  user_id uuid,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cta_events_name_created_idx ON public.cta_events (event_name, created_at DESC);
CREATE INDEX cta_events_created_idx ON public.cta_events (created_at DESC);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert click events
CREATE POLICY "Anyone can record CTA clicks"
  ON public.cta_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read CTA events
CREATE POLICY "Admins can view CTA events"
  ON public.cta_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
