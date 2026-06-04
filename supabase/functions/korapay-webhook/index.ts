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
      throw new Error("Missing webhook environment variables");
    }

    const payload = await req.json();
    const signature = req.headers.get("x-korapay-signature") || "";
    const expectedSignature = await signKorapayData(payload.data, korapaySecretKey);

    if (!safeEqual(signature, expectedSignature)) {
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
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await supabase.rpc("confirm_booking_payment_by_reference", {
      p_payment_reference: reference,
    });

    if (!error && data?.success) {
      return new Response(JSON.stringify({ received: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (metadata.booking !== "digitalridr") {
      throw new Error(data?.error || error?.message || "Failed to confirm booking");
    }

    const totalPrice = numberFromMetadata(metadata.total_price);
    const paidAmount = numberFromMetadata(payload.data?.amount, totalPrice);

    if (totalPrice <= 0 || paidAmount < totalPrice) {
      throw new Error("Paid amount does not match booking total");
    }

    const { data: createdBooking, error: createError } = await supabase.rpc("process_booking_payment", {
      p_listing_id: metadata.listing_id,
      p_guest_id: metadata.guest_id,
      p_host_id: metadata.host_id,
      p_check_in: metadata.check_in,
      p_check_out: metadata.check_out,
      p_guests: numberFromMetadata(metadata.guests, 1),
      p_total_price: totalPrice,
      p_platform_fee: numberFromMetadata(metadata.platform_fee),
      p_host_payout_amount: numberFromMetadata(metadata.host_payout_amount),
      p_payment_reference: reference,
      p_security_deposit: numberFromMetadata(metadata.security_deposit),
    });

    if (createError || !createdBooking?.success) {
      throw new Error(createdBooking?.error || createError?.message || "Failed to create paid booking");
    }

    return new Response(JSON.stringify({ received: true, data: createdBooking }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Korapay webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
