
-- Function to get leaderboard for a quiz (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(_quiz_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  best_score numeric,
  attempts_count bigint,
  last_attempt_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    qa.user_id,
    COALESCE(p.full_name, 'Unknown') as full_name,
    MAX(qa.score) as best_score,
    COUNT(qa.id) as attempts_count,
    MAX(qa.created_at) as last_attempt_at
  FROM quiz_attempts qa
  LEFT JOIN profiles p ON p.user_id = qa.user_id
  WHERE qa.quiz_id = _quiz_id
  GROUP BY qa.user_id, p.full_name
  ORDER BY best_score DESC, last_attempt_at ASC
  LIMIT _limit;
$$;
