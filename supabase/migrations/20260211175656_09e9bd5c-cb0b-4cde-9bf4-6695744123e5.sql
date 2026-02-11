
-- Create course-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('course-images', 'course-images', true);

-- Allow anyone to view course images
CREATE POLICY "Anyone can view course images" ON storage.objects FOR SELECT USING (bucket_id = 'course-images');

-- Allow admins to upload course images
CREATE POLICY "Admins can upload course images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update course images
CREATE POLICY "Admins can update course images" ON storage.objects FOR UPDATE USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete course images
CREATE POLICY "Admins can delete course images" ON storage.objects FOR DELETE USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));
