
-- Allow admins to delete newsletter subscribers
CREATE POLICY "Admins can delete subscribers"
ON public.newsletter_subscribers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update newsletter subscribers
CREATE POLICY "Admins can update subscribers"
ON public.newsletter_subscribers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
