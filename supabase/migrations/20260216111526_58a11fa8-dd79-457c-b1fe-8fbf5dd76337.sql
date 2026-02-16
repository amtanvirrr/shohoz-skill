
ALTER TABLE public.quizzes ADD COLUMN pass_mark numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.quizzes.pass_mark IS 'Minimum score required to pass (0 means no pass mark required)';
