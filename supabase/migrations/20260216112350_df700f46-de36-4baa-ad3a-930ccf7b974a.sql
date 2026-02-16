
-- Add price columns to quizzes
ALTER TABLE public.quizzes ADD COLUMN price integer NOT NULL DEFAULT 0;
ALTER TABLE public.quizzes ADD COLUMN original_price integer NULL;

-- Add 'quiz' to product_type enum
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'quiz';
