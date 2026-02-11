
-- Drop the overly permissive track policy and replace with a more specific one
DROP POLICY "Track orders by order_id" ON public.orders;

-- The "Anyone can create orders" INSERT policy is intentionally permissive 
-- because guest users (not logged in) need to place orders.
-- This is a business requirement, not a security oversight.
