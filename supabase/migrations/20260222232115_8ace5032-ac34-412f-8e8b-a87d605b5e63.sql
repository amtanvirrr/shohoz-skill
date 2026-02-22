
-- Create quiz_sections table for lesson-based quiz organization
CREATE TABLE public.quiz_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage quiz sections"
ON public.quiz_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view quiz sections"
ON public.quiz_sections FOR SELECT
USING (true);

-- Add section_id to quiz_questions (nullable for backward compatibility)
ALTER TABLE public.quiz_questions
ADD COLUMN section_id UUID REFERENCES public.quiz_sections(id) ON DELETE CASCADE DEFAULT NULL;
