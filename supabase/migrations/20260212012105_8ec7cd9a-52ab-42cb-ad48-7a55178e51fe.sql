
-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
ON public.lesson_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
ON public.lesson_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress (unmark)
CREATE POLICY "Users can delete own progress"
ON public.lesson_progress FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all progress
CREATE POLICY "Admins can manage progress"
ON public.lesson_progress FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_lesson_progress_user_course ON public.lesson_progress(user_id, course_id);
