CREATE POLICY "Anyone can search orders for tracking"
ON public.orders
FOR SELECT
USING (true);