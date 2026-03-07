-- ==============================================================================
-- MASTER SCHEMA (v4.0 - Consolidated)
-- ==============================================================================
-- This script contains the COMPLETE database setup for the DigitalRidr application.
-- It integrates all previous versions and recent features:
-- 1. Core Tables (Profiles, Listings, Bookings, etc.)
-- 2. Identity Verification
-- 3. Reviews System
-- 4. Admin Policies & Extended Profile Fields
-- 5. Messaging & Payments

-- ==============================================================================
-- PART 0: TYPES & ENUMS
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
        CREATE TYPE verification_status_enum AS ENUM ('unverified', 'pending', 'verified', 'rejected');
    END IF;
END
$$;

-- ==============================================================================
-- PART 1: TABLES
-- ==============================================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  -- Extended Fields (v4.0)
  date_of_birth date,
  phone_number text,
  
  is_host boolean default false,
  host_status text check (host_status in ('pending', 'approved', 'rejected', 'none')) default 'none',
  is_admin boolean default false,
  banned boolean default false,
  -- Verification Fields
  verification_status verification_status_enum default 'unverified',
  identity_doc_url text,
  selfie_url text,
  rejection_reason text,
  verification_submitted_at timestamp with time zone,
  -- Wallet
  wallet_balance numeric default 0,
  constraint username_length check (char_length(username) >= 3)
);
alter table public.profiles enable row level security;

-- 2. LISTINGS
create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  price_per_night numeric not null,
  location text not null,
  images text[] default '{}',
  amenities text[] default '{}',
  house_rules text[] default '{}',
  bedrooms integer default 1,
  bathrooms numeric default 1,
  max_guests integer default 1,
  city text,
  country text,
  is_superhost boolean default false,
  beds integer default 1,
  latitude numeric,
  longitude numeric,
  video_url text,
  address text,
  security_deposit numeric default 0,
  -- Check-in Instructions
  wifi_name text,
  wifi_password text,
  access_code text,
  check_in_instructions text,
  host_logo text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  rating numeric default 0,
  review_count integer default 0
);
alter table public.listings enable row level security;

-- 3. BOOKINGS
create table if not exists public.bookings (
    id uuid default gen_random_uuid() primary key,
    listing_id uuid references public.listings(id) not null,
    guest_id uuid references auth.users(id) on delete cascade not null,
    host_id uuid references auth.users(id) on delete cascade not null,
    check_in date not null,
    check_out date not null,
    guests integer default 1,
    total_price numeric not null,
    status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
    payment_reference text,
    payment_status text default 'pending',
    platform_fee numeric default 0,
    host_payout_amount numeric default 0,
    security_deposit numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.bookings enable row level security;

-- 4. PAYOUT METHODS
create table if not exists public.payout_methods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_primary boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.payout_methods enable row level security;

-- 5. PAYOUT REQUESTS
create table if not exists public.payout_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  status text check (status in ('pending', 'paid', 'rejected')) default 'pending',
  bank_name text,
  account_number text,
  account_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.payout_requests enable row level security;

-- 6. CONVERSATIONS & MESSAGES
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users(id) not null,
  guest_id uuid references auth.users(id) not null,
  listing_id uuid references public.listings(id),
  status text check (status in ('inquiry', 'confirmed', 'declined')) default 'inquiry',
  last_message text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.conversations enable row level security;

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.messages enable row level security;

-- 7. FAVORITES
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  listing_id uuid references public.listings(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, listing_id)
);
alter table public.favorites enable row level security;

-- 8. REVIEWS
create table if not exists public.reviews (
    id uuid default gen_random_uuid() primary key,
    listing_id uuid references public.listings(id) on delete cascade not null,
    guest_id uuid references auth.users(id) on delete cascade not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    content text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.reviews enable row level security;

-- ==============================================================================
-- PART 2: STORAGE BUCKETS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('secure-documents', 'secure-documents', false) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- PART 3: RLS POLICIES
-- ==============================================================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- --- LISTINGS ---
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON listings;
CREATE POLICY "Public listings are viewable by everyone" ON listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own listings" ON listings;
CREATE POLICY "Users can insert their own listings" ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can update own listings" ON listings;
CREATE POLICY "Users can update own listings" ON listings FOR UPDATE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Admins can delete any listing" ON listings;
CREATE POLICY "Admins can delete any listing" ON listings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- --- BOOKINGS ---
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = guest_id OR auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update bookings" ON bookings;
CREATE POLICY "Hosts can update bookings" ON bookings FOR UPDATE USING (host_id = auth.uid());

-- --- STORAGE POLICIES ---
-- Listing Images
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
CREATE POLICY "Allow public viewing" ON storage.objects FOR SELECT TO public USING (bucket_id = 'listing-images');

-- Avatars
DROP POLICY IF EXISTS "Avatars images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner);

-- Secure Documents
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'secure-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'secure-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'secure-documents' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- --- PAYOUTS & METHODS ---
DROP POLICY IF EXISTS "Users can manage own payout methods" ON payout_methods;
CREATE POLICY "Users can manage own payout methods" ON payout_methods FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own payout requests" ON payout_requests;
CREATE POLICY "Users can view own payout requests" ON payout_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create payout requests" ON payout_requests;
CREATE POLICY "Users can create payout requests" ON payout_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- --- CONVERSATIONS & MESSAGES ---
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
CREATE POLICY "Users can insert conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.host_id = auth.uid() OR c.guest_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.host_id = auth.uid() OR c.guest_id = auth.uid()))
);

-- --- FAVORITES ---
DROP POLICY IF EXISTS "Users can manage their favorites" ON favorites;
CREATE POLICY "Users can manage their favorites" ON favorites FOR ALL USING (user_id = auth.uid());

-- --- REVIEWS ---
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = guest_id);

-- ==============================================================================
-- PART 4: VIEWS & TRIGGERS
-- ==============================================================================

-- 1. Pending Verifications View
DROP VIEW IF EXISTS public.pending_verifications;
CREATE OR REPLACE VIEW public.pending_verifications AS
SELECT id, full_name, avatar_url, identity_doc_url, selfie_url, verification_status, verification_submitted_at
FROM public.profiles
WHERE verification_status = 'pending';

GRANT SELECT ON public.pending_verifications TO authenticated;
GRANT SELECT ON public.pending_verifications TO service_role;

-- 2. New User Trigger (Updated with phone & dob)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username, date_of_birth, phone_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'date_of_birth')::date,
    new.raw_user_meta_data->>'phone_number'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Review Rating Trigger
CREATE OR REPLACE FUNCTION public.update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.listings
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id))
    WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE PROCEDURE public.update_listing_rating();

-- ==============================================================================
-- PART 5: RPC FUNCTIONS
-- ==============================================================================

-- 1. Get Blocked Dates
CREATE OR REPLACE FUNCTION get_blocked_dates(listing_id_input uuid)
RETURNS TABLE (check_in timestamp with time zone, check_out timestamp with time zone) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT b.check_in, b.check_out FROM bookings b
  WHERE b.listing_id = listing_id_input AND (b.status = 'confirmed' OR b.status = 'pending');
END;
$$;
GRANT EXECUTE ON FUNCTION get_blocked_dates TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_dates TO anon;

-- 2. Submit Verification
CREATE OR REPLACE FUNCTION submit_identity_verification(doc_url text, selfie_url_input text) 
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET identity_doc_url = doc_url, selfie_url = selfie_url_input, verification_status = 'pending', verification_submitted_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 3. Review Verification
CREATE OR REPLACE FUNCTION review_identity_verification(
    user_id_input uuid, 
    status_input text, 
    rejection_reason_input text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF status_input NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be "verified" or "rejected".';
  END IF;

  UPDATE public.profiles
  SET 
    verification_status = status_input::verification_status_enum,
    identity_doc_url = CASE WHEN status_input = 'rejected' THEN NULL ELSE identity_doc_url END,
    selfie_url = CASE WHEN status_input = 'rejected' THEN NULL ELSE selfie_url END,
    rejection_reason = rejection_reason_input,
    verification_submitted_at = CASE WHEN status_input = 'rejected' THEN NULL ELSE verification_submitted_at END
  WHERE id = user_id_input;
END;
$$;

-- 4. Process Booking Payment
CREATE OR REPLACE FUNCTION public.process_booking_payment(
  p_listing_id uuid, p_guest_id uuid, p_host_id uuid,
  p_check_in date, p_check_out date, p_guests integer,
  p_total_price numeric, p_platform_fee numeric, p_host_payout_amount numeric,
  p_payment_reference text, p_security_deposit numeric DEFAULT 0
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_booking_id uuid;
BEGIN
  INSERT INTO public.bookings (
    listing_id, guest_id, host_id, check_in, check_out, guests, total_price, platform_fee, host_payout_amount, payment_reference, security_deposit, payment_status, status
  ) VALUES (
    p_listing_id, p_guest_id, p_host_id, p_check_in, p_check_out, p_guests, p_total_price, p_platform_fee, p_host_payout_amount, p_payment_reference, p_security_deposit, 'paid', 'confirmed'
  ) RETURNING id INTO v_booking_id;

  UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + p_host_payout_amount WHERE id = p_host_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==============================================================================
-- PART 6: NOTIFICATIONS SYSTEM
-- ==============================================================================

-- 1. Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('system', 'verification', 'booking', 'security', 'payment')),
  title text not null,
  message text not null,
  is_read boolean default false,
  action_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS Policies
alter table public.notifications enable row level security;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Functions & Triggers

-- Trigger: Handle Identity Verification Updates
CREATE OR REPLACE FUNCTION public.handle_verification_update() RETURNS trigger AS $$
BEGIN
  -- Case 1: Verification Approved
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.id,
      'verification',
      '🎉 Identity Verified!',
      'Congratulations! Your identity has been successfully verified. You can now list properties and accept bookings.',
      '/host/dashboard'
    );
  
  -- Case 2: Verification Rejected
  ELSIF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.id,
      'verification',
      '⚠️ Verification Rejected',
      'Your identity verification was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'Documents did not meet requirements.'),
      '/host/verification'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_verification_status_change ON public.profiles;
CREATE TRIGGER on_verification_status_change
  AFTER UPDATE OF verification_status ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_verification_update();


-- Trigger: Handle Booking Notifications
CREATE OR REPLACE FUNCTION public.handle_booking_notification() RETURNS trigger AS $$
DECLARE
  v_guest_name text;
  v_listing_title text;
  v_host_id uuid;
  v_guest_id uuid;
BEGIN
  -- Get helper data (Guest Name, Listing Title)
  SELECT full_name INTO v_guest_name FROM public.profiles WHERE id = COALESCE(NEW.guest_id, OLD.guest_id);
  SELECT title, host_id INTO v_listing_title, v_host_id FROM public.listings WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  v_guest_id := COALESCE(NEW.guest_id, OLD.guest_id);

  -- Case 1: New Booking Request (INSERT)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.host_id,
      'booking',
      '🏠 New Booking Request!',
      'You have a new request from ' || COALESCE(v_guest_name, 'a guest') || ' for ' || COALESCE(v_listing_title, 'your property') || '.',
      '/host/dashboard',
      jsonb_build_object('booking_id', NEW.id)
    );

  -- Case 2: Booking Confirmed (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Notify Guest
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.guest_id,
      'booking',
      '✅ Booking Confirmed!',
      'Your stay at ' || COALESCE(v_listing_title, 'property') || ' has been confirmed! Pack your bags.',
      '/trips',
      jsonb_build_object('booking_id', NEW.id)
    );
    -- Notify Host (Confirmation success)
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.host_id,
      'booking',
      '✅ Booking Confirmed!',
      'You have successfully confirmed the booking for ' || COALESCE(v_listing_title, 'property') || '.',
      '/host/dashboard',
      jsonb_build_object('booking_id', NEW.id)
    );

  -- Case 3: Booking Cancelled (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Notify Host (if Guest cancelled OR System cancelled) - Simplified: Notify Host
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.host_id,
      'booking',
      '❌ Booking Cancelled',
      'The booking for ' || COALESCE(v_listing_title, 'your property') || ' has been cancelled.',
      '/host/dashboard',
      jsonb_build_object('booking_id', NEW.id)
    );
     -- Notify Guest
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.guest_id,
      'booking',
      '❌ Booking Cancelled',
      'Your booking for ' || COALESCE(v_listing_title, 'property') || ' was cancelled.',
      '/trips',
      jsonb_build_object('booking_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_change ON public.bookings;
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_booking_notification();


-- Trigger: Handle Payout Notifications
CREATE OR REPLACE FUNCTION public.handle_payout_notification() RETURNS trigger AS $$
BEGIN
  -- Case 1: Payout Paid
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.user_id,
      'payment',
      '💸 Payout Sent',
      'Your payout of ₦' || NEW.amount || ' has been processed and sent to your bank.',
      '/host/wallet'
    );

  -- Case 2: Payout Rejected
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.user_id,
      'payment',
      '⚠️ Payout Rejected',
      'Your payout request was rejected. Please check your bank details or contact support.',
      '/host/wallet'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payout_change ON public.payout_requests;
CREATE TRIGGER on_payout_change
  AFTER UPDATE OF status ON public.payout_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_payout_notification();


