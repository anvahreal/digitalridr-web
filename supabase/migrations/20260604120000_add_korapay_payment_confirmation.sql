-- Confirm a pending booking after Korapay reports a successful charge.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment_by_reference(
  p_payment_reference text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_host_id uuid;
  v_host_payout_amount numeric;
  v_payment_status text;
  v_status text;
BEGIN
  SELECT id, host_id, host_payout_amount, payment_status, status
  INTO v_booking_id, v_host_id, v_host_payout_amount, v_payment_status, v_status
  FROM public.bookings
  WHERE payment_reference = p_payment_reference
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_booking_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found for payment reference');
  END IF;

  IF v_payment_status = 'paid' AND v_status = 'confirmed' THEN
    RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'already_confirmed', true);
  END IF;

  UPDATE public.bookings
  SET payment_status = 'paid',
      status = 'confirmed'
  WHERE id = v_booking_id;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(v_host_payout_amount, 0)
  WHERE id = v_host_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_payment_by_reference(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment_by_reference(text) TO service_role;
