
-- Create storage bucket for landing page images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-page-images', 'landing-page-images', true);

-- Public read access
CREATE POLICY "Anyone can view landing page images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

-- Admin upload
CREATE POLICY "Admins can upload landing page images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-page-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admin delete
CREATE POLICY "Admins can delete landing page images"
ON storage.objects FOR DELETE
USING (bucket_id = 'landing-page-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admin update
CREATE POLICY "Admins can update landing page images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'landing-page-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
