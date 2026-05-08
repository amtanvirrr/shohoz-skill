
DROP VIEW IF EXISTS public.quiz_questions_public;

-- Returns questions WITHOUT correct_option / explanation
CREATE OR REPLACE FUNCTION public.get_quiz_questions(_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  section_id uuid,
  question text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qq.id, qq.quiz_id, qq.section_id, qq.question,
         qq.option_a, qq.option_b, qq.option_c, qq.option_d, qq.sort_order
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id AND q.is_published = true
  ORDER BY qq.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO anon, authenticated;

-- Returns per-quiz question counts for listings
CREATE OR REPLACE FUNCTION public.get_quiz_question_counts()
RETURNS TABLE (quiz_id uuid, question_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qq.quiz_id, COUNT(*)::bigint
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE q.is_published = true
  GROUP BY qq.quiz_id;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_question_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_question_counts() TO anon, authenticated;
