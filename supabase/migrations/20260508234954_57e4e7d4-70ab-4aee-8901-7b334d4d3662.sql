
-- 1) Lock down quiz_questions: drop public SELECT (admins still have full access via existing policy)
DROP POLICY IF EXISTS "Anyone can view questions of published quizzes" ON public.quiz_questions;

-- 2) Public view: questions without correct_option / explanation
CREATE OR REPLACE VIEW public.quiz_questions_public AS
SELECT qq.id, qq.quiz_id, qq.section_id, qq.question,
       qq.option_a, qq.option_b, qq.option_c, qq.option_d, qq.sort_order
FROM public.quiz_questions qq
WHERE EXISTS (
  SELECT 1 FROM public.quizzes q
  WHERE q.id = qq.quiz_id AND q.is_published = true
);

GRANT SELECT ON public.quiz_questions_public TO anon, authenticated;

-- 3) Server-side scoring
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _quiz_id uuid,
  _answers jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _quiz record;
  _correct integer := 0;
  _wrong integer := 0;
  _skipped integer := 0;
  _total integer := 0;
  _score numeric := 0;
  _correct_map jsonb := '{}'::jsonb;
  _explanations jsonb := '{}'::jsonb;
  _q record;
  _ans text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, price, negative_marking, negative_mark_value, is_published
  INTO _quiz FROM public.quizzes WHERE id = _quiz_id;
  IF NOT FOUND OR NOT _quiz.is_published THEN
    RAISE EXCEPTION 'Quiz not available';
  END IF;

  IF _quiz.price > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE user_id = _user_id
        AND product_id = _quiz_id
        AND product_type = 'quiz'::product_type
        AND status IN ('confirmed'::order_status, 'delivered'::order_status)
    ) THEN
      RAISE EXCEPTION 'Quiz not purchased';
    END IF;
  END IF;

  FOR _q IN
    SELECT id, correct_option, explanation
    FROM public.quiz_questions
    WHERE quiz_id = _quiz_id
  LOOP
    _total := _total + 1;
    _correct_map := _correct_map || jsonb_build_object(_q.id::text, _q.correct_option);
    IF _q.explanation IS NOT NULL AND _q.explanation <> '' THEN
      _explanations := _explanations || jsonb_build_object(_q.id::text, _q.explanation);
    END IF;
    _ans := _answers->>(_q.id::text);
    IF _ans IS NULL OR _ans = '' THEN
      _skipped := _skipped + 1;
    ELSIF _ans = _q.correct_option THEN
      _correct := _correct + 1;
    ELSE
      _wrong := _wrong + 1;
    END IF;
  END LOOP;

  _score := _correct;
  IF _quiz.negative_marking THEN
    _score := _correct - (_wrong * _quiz.negative_mark_value);
  END IF;

  INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total_questions, answers)
  VALUES (_quiz_id, _user_id, _score, _total, _answers);

  RETURN jsonb_build_object(
    'score', _score,
    'correct', _correct,
    'wrong', _wrong,
    'skipped', _skipped,
    'total', _total,
    'correct_map', _correct_map,
    'explanations', _explanations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- 4) Blog post views table for session-based dedup
CREATE TABLE IF NOT EXISTS public.blog_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, session_id)
);

ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blog post views"
  ON public.blog_post_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Replace increment_blog_view with session-aware version
DROP FUNCTION IF EXISTS public.increment_blog_view(uuid);

CREATE OR REPLACE FUNCTION public.increment_blog_view(post_id uuid, session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sid text := COALESCE(NULLIF(trim(session_id), ''), '');
BEGIN
  IF _sid = '' OR length(_sid) > 128 THEN
    RETURN;
  END IF;
  INSERT INTO public.blog_post_views (post_id, session_id)
  VALUES (post_id, _sid)
  ON CONFLICT (post_id, session_id) DO NOTHING;
  IF FOUND THEN
    UPDATE public.blog_posts SET view_count = view_count + 1 WHERE id = post_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_view(uuid, text) TO anon, authenticated;
