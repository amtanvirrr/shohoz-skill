
-- Add RLS policies for ebook-files storage bucket (bucket already exists)
CREATE POLICY "Admins can upload ebooks"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ebook-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update ebooks"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ebook-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete ebooks"
ON storage.objects FOR DELETE
USING (bucket_id = 'ebook-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));
