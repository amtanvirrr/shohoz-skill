
-- Add unsubscribe_token to newsletter_subscribers for secure unsubscribe
ALTER TABLE public.newsletter_subscribers 
ADD COLUMN unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Create unique index on the token
CREATE UNIQUE INDEX idx_newsletter_unsubscribe_token ON public.newsletter_subscribers(unsubscribe_token);
