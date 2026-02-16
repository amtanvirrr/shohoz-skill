
-- Add slug column to books
ALTER TABLE public.books ADD COLUMN slug text;

-- Add slug column to courses  
ALTER TABLE public.courses ADD COLUMN slug text;

-- Add slug column to quizzes
ALTER TABLE public.quizzes ADD COLUMN slug text;

-- Generate slugs for existing books from title
UPDATE public.books SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\u0980-\u09FF\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8);

-- Generate slugs for existing courses from title
UPDATE public.courses SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\u0980-\u09FF\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8);

-- Generate slugs for existing quizzes from title
UPDATE public.quizzes SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\u0980-\u09FF\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8);

-- Make slug NOT NULL and UNIQUE
ALTER TABLE public.books ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.books ADD CONSTRAINT books_slug_unique UNIQUE (slug);

ALTER TABLE public.courses ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.courses ADD CONSTRAINT courses_slug_unique UNIQUE (slug);

ALTER TABLE public.quizzes ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_slug_unique UNIQUE (slug);
