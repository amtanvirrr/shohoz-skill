
-- Create shipping zones table
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  zone_label TEXT NOT NULL DEFAULT '',
  shipping_rate INTEGER NOT NULL DEFAULT 0,
  free_shipping_minimum INTEGER DEFAULT NULL,
  delivery_time_min INTEGER NOT NULL DEFAULT 1,
  delivery_time_max INTEGER NOT NULL DEFAULT 3,
  delivery_time_unit TEXT NOT NULL DEFAULT 'days',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage shipping zones"
  ON public.shipping_zones FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active zones
CREATE POLICY "Anyone can view active shipping zones"
  ON public.shipping_zones FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default zones
INSERT INTO public.shipping_zones (zone_name, zone_label, shipping_rate, free_shipping_minimum, delivery_time_min, delivery_time_max, sort_order) VALUES
  ('inside_dhaka', 'ঢাকার ভিতরে', 60, 500, 1, 2, 1),
  ('outside_dhaka', 'ঢাকার বাইরে', 120, 1000, 3, 5, 2);
