-- ==============================================================================
-- FIX: Korapay Booking Flow
-- ==============================================================================
-- 1. Make process_booking_payment IDEMPOTENT (prevent duplicate bookings)
-- 2. Grant EXECUTE to authenticated (so frontend can call it directly)
-- 3. Create booking_sessions table with proper migration
-- ==============================================================================

-- 1. Replace process_booking_payment with idempotent version
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
  v_existing_status text;
BEGIN
  -- Idempotency check: if a booking with this payment_reference already exists, return early
  SELECT id, payment_status INTO v_existing_id, v_existing_status
  FROM public.bookings
  WHERE payment_reference = p_payment_reference
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Already exists — don't create a duplicate
    RETURN json_build_object(
      'success', true,
      'booking_id', v_existing_id,
      'already_confirmed', true
    );
  END IF;

  -- Create the booking
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
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Grant to both service_role (webhook) and authenticated (frontend)
GRANT EXECUTE ON FUNCTION public.process_booking_payment(uuid, uuid, uuid, date, date, integer, numeric, numeric, numeric, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_booking_payment(uuid, uuid, uuid, date, date, integer, numeric, numeric, numeric, text, numeric) TO authenticated;

-- 3. Create booking_sessions table (tracks pre-payment sessions for webhook fallback)
CREATE TABLE IF NOT EXISTS public.booking_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  check_in text,
  check_out text,
  total_price numeric,
  guests integer DEFAULT 1,
  platform_fee numeric DEFAULT 0,
  host_payout_amount numeric DEFAULT 0,
  security_deposit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;

-- Users can create their own sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.booking_sessions;
CREATE POLICY "Users can insert own sessions" ON public.booking_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = guest_id);

-- Users can read their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.booking_sessions;
CREATE POLICY "Users can view own sessions" ON public.booking_sessions
  FOR SELECT TO authenticated USING (auth.uid() = guest_id);

-- Service role has full access (for webhook)
DROP POLICY IF EXISTS "Service role full access to sessions" ON public.booking_sessions;
CREATE POLICY "Service role full access to sessions" ON public.booking_sessions
  FOR ALL TO service_role USING (true);

-- 4. Add admin RLS policy on bookings (so admin dashboard can see ALL bookings)
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

