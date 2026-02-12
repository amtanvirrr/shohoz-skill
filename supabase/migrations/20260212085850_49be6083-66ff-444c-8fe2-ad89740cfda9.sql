
-- Add view_count column to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create a function to increment view count (accessible by anyone)
CREATE OR REPLACE FUNCTION public.increment_blog_view(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE blog_posts SET view_count = view_count + 1 WHERE id = post_id;
$$;
