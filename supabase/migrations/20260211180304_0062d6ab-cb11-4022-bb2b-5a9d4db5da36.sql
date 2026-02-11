
-- Create lesson_resources table for file uploads per lesson
CREATE TABLE public.lesson_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lesson resources" ON public.lesson_resources FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view lesson resources" ON public.lesson_resources FOR SELECT USING (true);

-- Add lesson_id to quizzes table (nullable so standalone quizzes still work)
ALTER TABLE public.quizzes ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;

-- Add video_url and lesson_type to lessons for richer content
ALTER TABLE public.lessons ADD COLUMN video_url TEXT DEFAULT '';
ALTER TABLE public.lessons ADD COLUMN lesson_type TEXT NOT NULL DEFAULT 'text';

-- Create lesson-resources storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-resources', 'lesson-resources', true);

CREATE POLICY "Anyone can view lesson resources files" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-resources');
CREATE POLICY "Admins can upload lesson resources" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lesson-resources' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update lesson resources" ON storage.objects FOR UPDATE USING (bucket_id = 'lesson-resources' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete lesson resources" ON storage.objects FOR DELETE USING (bucket_id = 'lesson-resources' AND public.has_role(auth.uid(), 'admin'));
