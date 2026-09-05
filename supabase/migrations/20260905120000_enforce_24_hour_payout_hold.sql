-- Hosts can only request payouts from paid bookings after the 24-hour post-checkout hold.
CREATE OR REPLACE FUNCTION public.validate_payout_request_available_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligible_payout numeric;
  v_reserved_payout numeric;
  v_available_payout numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount < 1000 THEN
    RAISE EXCEPTION 'Minimum payout request is ₦1,000';
  END IF;

  -- check_out is a date, so release at midnight after checkout day + 24 hours.
  SELECT COALESCE(SUM(host_payout_amount), 0)
  INTO v_eligible_payout
  FROM public.bookings
  WHERE host_id = NEW.user_id
    AND status IN ('confirmed', 'completed')
    AND payment_status = 'paid'
    AND (check_out::timestamp + interval '2 days') <= now();

  SELECT COALESCE(SUM(amount), 0)
  INTO v_reserved_payout
  FROM public.payout_requests
  WHERE user_id = NEW.user_id
    AND status IN ('pending', 'paid')
    AND id IS DISTINCT FROM NEW.id;

  v_available_payout := GREATEST(0, v_eligible_payout - v_reserved_payout);

  IF NEW.amount > v_available_payout THEN
    RAISE EXCEPTION 'Payout exceeds available balance. Available payout is %', v_available_payout;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_24_hour_payout_hold ON public.payout_requests;
CREATE TRIGGER enforce_24_hour_payout_hold
  BEFORE INSERT OR UPDATE OF amount, status ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payout_request_available_balance();
