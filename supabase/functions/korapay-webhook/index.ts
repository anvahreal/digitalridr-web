import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-korapay-signature",
};

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
};

const signKorapayData = async (data: unknown, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(JSON.stringify(data)),
  );

  return toHex(signature);
};

const numberFromMetadata = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const korapaySecretKey = Deno.env.get("KORAPAY_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!korapaySecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing env vars:", {
        hasSecret: !!korapaySecretKey,
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceRoleKey,
      });
      throw new Error("Missing webhook environment variables");
    }

    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify({
      event: payload.event || payload.type,
      status: payload.data?.status,
      reference: payload.data?.payment_reference || payload.data?.reference,
      amount: payload.data?.amount,
      hasMetadata: !!payload.data?.metadata,
      sessionId: payload.data?.metadata?.session_id,
    }));

    const signature = req.headers.get("x-korapay-signature") || "";
    const expectedSignature = await signKorapayData(payload.data, korapaySecretKey);

    if (!safeEqual(signature, expectedSignature)) {
      console.error("Signature mismatch — rejecting webhook");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = payload.event || payload.type;
    const status = String(payload.data?.status || "").toLowerCase();
    const reference = payload.data?.payment_reference || payload.data?.reference;
    const metadata = payload.data?.metadata || {};

    if (event !== "charge.success" && status !== "success" && status !== "successful") {
      console.log("Ignoring non-success event:", event, status);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reference) {
      console.error("Missing payment reference in webhook payload");
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Path 1: Try to confirm an existing booking by reference
    // (covers: frontend already created it, or bank transfer booking)
    console.log("Attempting confirm_booking_payment_by_reference:", reference);
    const { data, error } = await supabase.rpc("confirm_booking_payment_by_reference", {
      p_payment_reference: reference,
    });

    if (!error && data?.success) {
      console.log("Booking confirmed via reference lookup:", JSON.stringify(data));
      return new Response(JSON.stringify({ received: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Reference lookup didn't find booking, trying session path...", {
      rpcError: error?.message,
      rpcData: data,
    });

    // Path 2: Fall back to creating from booking_sessions
    if (!metadata.session_id && metadata.booking !== "digitalridr") {
      throw new Error(data?.error || error?.message || "Failed to confirm booking: Missing session_id");
    }

    let sessionData = metadata;
    
    // If a session_id was provided, fetch the full details from booking_sessions
    if (metadata.session_id) {
      console.log("Fetching booking_session:", metadata.session_id);
      const { data: session, error: sessionError } = await supabase
        .from('booking_sessions')
        .select('*')
        .eq('id', metadata.session_id)
        .single();
        
      if (sessionError || !session) {
        console.error("Session fetch failed:", sessionError?.message);
        throw new Error("Invalid session_id or session not found.");
      }
      console.log("Session found, creating booking from session data");
      sessionData = session;
    }

    const totalPrice = numberFromMetadata(sessionData.total_price);
    const paidAmount = numberFromMetadata(payload.data?.amount, totalPrice);

    if (totalPrice <= 0 || paidAmount < totalPrice) {
      console.error("Amount mismatch:", { totalPrice, paidAmount });
      throw new Error("Paid amount does not match booking total");
    }

    // This RPC is now idempotent — if frontend already created the booking, it returns success
    console.log("Calling process_booking_payment (idempotent)...");
    const { data: createdBooking, error: createError } = await supabase.rpc("process_booking_payment", {
      p_listing_id: sessionData.listing_id,
      p_guest_id: sessionData.guest_id,
      p_host_id: sessionData.host_id,
      p_check_in: sessionData.check_in,
      p_check_out: sessionData.check_out,
      p_guests: numberFromMetadata(sessionData.guests, 1),
      p_total_price: totalPrice,
      p_platform_fee: numberFromMetadata(sessionData.platform_fee),
      p_host_payout_amount: numberFromMetadata(sessionData.host_payout_amount),
      p_payment_reference: reference,
      p_security_deposit: numberFromMetadata(sessionData.security_deposit),
    });

    if (createError || !createdBooking?.success) {
      console.error("process_booking_payment failed:", createError?.message, createdBooking);
      throw new Error(createdBooking?.error || createError?.message || "Failed to create paid booking");
    }

    console.log("Booking created/confirmed via webhook:", JSON.stringify(createdBooking));

    return new Response(JSON.stringify({ received: true, data: createdBooking }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Korapay webhook error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
