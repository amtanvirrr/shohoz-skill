
-- Create public_site_settings table
CREATE TABLE public.public_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view public settings"
  ON public.public_site_settings FOR SELECT USING (true);

-- Only admins can write
CREATE POLICY "Admins can manage public settings"
  ON public.public_site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Copy existing public keys from site_settings
INSERT INTO public.public_site_settings (key, value)
SELECT key, value FROM public.site_settings
WHERE key IN (
  'site_name','site_description','copyright_text',
  'logo_url','footer_logo_url','admin_logo_url','favicon_url',
  'facebook_pixel_id','facebook_test_event_code',
  'contact_email','contact_phone','contact_address',
  'hero_title','hero_subtitle',
  'hero_btn1_text','hero_btn1_link','hero_btn2_text','hero_btn2_link',
  'hero_stat1_value','hero_stat1_label',
  'hero_stat2_value','hero_stat2_label',
  'hero_stat3_value','hero_stat3_label'
)
ON CONFLICT (key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_public_site_settings_updated_at
BEFORE UPDATE ON public.public_site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
