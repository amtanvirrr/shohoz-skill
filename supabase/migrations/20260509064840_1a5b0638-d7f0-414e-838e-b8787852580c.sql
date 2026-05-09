
CREATE OR REPLACE FUNCTION public.validate_order_payment_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- COD always allowed (physical books)
  IF NEW.payment_method::text = 'cod' THEN
    RETURN NEW;
  END IF;

  -- SSLCommerz must be globally enabled
  IF NEW.payment_method::text = 'sslcommerz' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.public_site_settings
      WHERE key = 'sslcz_enabled' AND value = 'true'
    ) THEN
      RAISE EXCEPTION 'অনলাইন পেমেন্ট বর্তমানে নিষ্ক্রিয়';
    END IF;
    RETURN NEW;
  END IF;

  -- All other methods (bkash/nagad/rocket/upay) must be active in payment_methods
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_methods
    WHERE provider = NEW.payment_method::text AND is_active = true
  ) THEN
    RAISE EXCEPTION 'এই পেমেন্ট পদ্ধতি বর্তমানে নিষ্ক্রিয়';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_payment_method_trigger ON public.orders;
CREATE TRIGGER validate_order_payment_method_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_payment_method();
