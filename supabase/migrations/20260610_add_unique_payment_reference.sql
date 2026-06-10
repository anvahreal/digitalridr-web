-- ==============================================================================
-- FIX: Prevent Duplicate Bookings via Unique Payment Reference Constraint
-- ==============================================================================

-- 1. Clean up the existing duplicate booking and correct wallet balance
DELETE FROM public.bookings WHERE id = 'caaf217b-d52f-4fc2-9645-90fe06aa1acd';

UPDATE public.profiles
SET wallet_balance = COALESCE(wallet_balance, 0) - 450
WHERE id = '56b6cf1a-2f44-49e7-b1fa-83f0dcd524ca';

-- 2. Add unique constraint to payment_reference on bookings table
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_reference_key UNIQUE (payment_reference);

-- 3. Replace process_booking_payment with a concurrency-safe version using EXCEPTION block
CREATE OR REPLACE FUNCTION public.process_booking_payment(
  p_listing_id uuid, p_guest_id uuid, p_host_id uuid,
  p_check_in date, p_check_out date, p_guests integer,
  p_total_price numeric, p_platform_fee numeric, p_host_payout_amount numeric,
  p_payment_reference text, p_security_deposit numeric DEFAULT 0
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking_id uuid;
  v_existing_id uuid;
BEGIN
  -- 1. Double check if booking already exists (standard check)
  SELECT id INTO v_existing_id
  FROM public.bookings
  WHERE payment_reference = p_payment_reference
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'booking_id', v_existing_id,
      'already_confirmed', true
    );
  END IF;

  -- 2. Attempt insert inside a block to catch unique key violations (concurrency safety)
  BEGIN
    INSERT INTO public.bookings (
      listing_id, guest_id, host_id, check_in, check_out, guests,
      total_price, platform_fee, host_payout_amount,
      payment_reference, security_deposit, payment_status, status
    ) VALUES (
      p_listing_id, p_guest_id, p_host_id, p_check_in, p_check_out, p_guests,
      p_total_price, p_platform_fee, p_host_payout_amount,
      p_payment_reference, p_security_deposit, 'paid', 'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- Credit host wallet
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_host_payout_amount
    WHERE id = p_host_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
  EXCEPTION WHEN unique_violation THEN
    -- If a concurrent transaction inserted the same reference just after our initial check,
    -- catch the exception and return the existing booking id.
    SELECT id INTO v_existing_id
    FROM public.bookings
    WHERE payment_reference = p_payment_reference
    LIMIT 1;

    RETURN json_build_object(
      'success', true,
      'booking_id', v_existing_id,
      'already_confirmed', true
    );
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
