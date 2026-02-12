
-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, blog_post_id)
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can view own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own bookmarks
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);
