
CREATE TABLE public.reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_page INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading progress"
ON public.reading_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
ON public.reading_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
ON public.reading_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX idx_reading_progress_user_book ON public.reading_progress(user_id, book_id);
