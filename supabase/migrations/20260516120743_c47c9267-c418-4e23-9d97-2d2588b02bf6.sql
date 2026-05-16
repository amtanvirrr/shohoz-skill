DROP FUNCTION IF EXISTS public.__sign_storage(text, text, int);

CREATE POLICY "__temp_export_ebooks"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ebook-files');