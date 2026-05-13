
-- Remove public read access to coupons; expose only a safe RPC for validation
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Validation RPC - returns only what's needed for client to apply discount
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal integer)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value integer, error text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c
  FROM public.coupons
  WHERE upper(coupons.code) = upper(trim(_code)) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 'invalid'::text;
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 'expired'::text;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 'exhausted'::text;
    RETURN;
  END IF;

  IF c.min_order_amount > 0 AND _subtotal < c.min_order_amount THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, ('min:' || c.min_order_amount)::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, NULL::text;
END;
$$;

-- Safe increment RPC - takes only the coupon id
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon_id AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO anon, authenticated;
