import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const asMoney = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(value);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceKey || !resendKey) return reply({ error: "Email service is not configured" }, 500);

  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return reply({ error: "Unauthorized" }, 401);

  try {
    const { event, resourceId } = await req.json();
    if (!resourceId || !["manual_booking", "payout_request", "booking_cancelled", "host_application"].includes(event)) {
      return reply({ error: "Invalid notification event" }, 400);
    }

    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_admin", true)
      .not("email", "is", null);
    if (adminError) throw adminError;
    const configuredAdmins = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const recipients = [...new Set([...(admins || []).map((admin) => admin.email), ...configuredAdmins].filter(Boolean))];
    if (!recipients.length) return reply({ sent: false, reason: "No admin email recipients configured" });

    let subject = "";
    let html = "";

    if (event === "host_application") {
      if (resourceId !== userData.user.id) return reply({ error: "Host application not found" }, 404);
      const { data: applicant, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, host_status")
        .eq("id", resourceId)
        .single();
      if (error || !applicant || applicant.host_status !== "pending") return reply({ error: "Host application not found" }, 404);

      subject = "New host application requires review";
      html = `<p>A user has applied to become a DigitalRidr host.</p>
        <p><b>Name:</b> ${applicant.full_name || "Not provided"}<br />
        <b>Email:</b> ${applicant.email || userData.user.email || "Not provided"}<br />
        <b>Phone:</b> ${applicant.phone_number || "Not provided"}</p>
        <p>Review the application in the DigitalRidr admin dashboard.</p>`;
    } else if (event === "payout_request") {
      const { data: payout, error } = await supabase
        .from("payout_requests")
        .select("id, user_id, amount, bank_name, account_number, account_name")
        .eq("id", resourceId)
        .single();
      if (error || !payout || payout.user_id !== userData.user.id) return reply({ error: "Payout request not found" }, 404);

      const { data: host } = await supabase.from("profiles").select("full_name, email").eq("id", payout.user_id).single();
      subject = "New payout request requires review";
      html = `<p>A host has submitted a payout request.</p>
        <p><b>Host:</b> ${host?.full_name || host?.email || "Unknown"}<br />
        <b>Amount:</b> ${asMoney(Number(payout.amount))}<br />
        <b>Bank:</b> ${payout.bank_name || "Not provided"}<br />
        <b>Account:</b> ${payout.account_number || "Not provided"} (${payout.account_name || "Not provided"})</p>
        <p>Review it in the DigitalRidr admin dashboard.</p>`;
    } else {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, guest_id, host_id, listing_id, total_price, payment_reference, status, check_in, check_out")
        .eq("id", resourceId)
        .single();
      if (error || !booking) return reply({ error: "Booking not found" }, 404);

      const isGuest = booking.guest_id === userData.user.id;
      const isHost = booking.host_id === userData.user.id;
      if (event === "manual_booking" && !isGuest) return reply({ error: "Booking not found" }, 404);
      if (event === "booking_cancelled" && !isGuest && !isHost) return reply({ error: "Booking not found" }, 404);

      const [{ data: listing }, { data: guest }, { data: host }] = await Promise.all([
        supabase.from("listings").select("title").eq("id", booking.listing_id).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", booking.guest_id).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", booking.host_id).maybeSingle(),
      ]);
      const property = listing?.title || "a property";
      const dates = `${new Date(booking.check_in).toLocaleDateString("en-NG")} – ${new Date(booking.check_out).toLocaleDateString("en-NG")}`;
      if (event === "manual_booking") {
        subject = "New bank-transfer booking requires payment review";
        html = `<p>A guest has submitted a bank-transfer booking.</p>
          <p><b>Property:</b> ${property}<br /><b>Guest:</b> ${guest?.full_name || guest?.email || "Unknown"}<br />
          <b>Dates:</b> ${dates}<br /><b>Total:</b> ${asMoney(Number(booking.total_price))}<br />
          <b>Reference:</b> ${booking.payment_reference || "Not provided"}</p><p>Review the payment in the DigitalRidr admin dashboard.</p>`;
      } else {
        if (booking.status !== "cancelled") return reply({ error: "Booking has not been cancelled" }, 400);
        const recipient = isGuest ? host : guest;
        const recipientEmail = recipient?.email;
        if (recipientEmail) {
          await new Resend(resendKey).emails.send({
            from: "DigitalRidr <onboarding@resend.dev>", to: [recipientEmail],
            subject: "Booking cancelled",
            html: `<p>Hi ${recipient?.full_name || "there"},</p><p>The booking for <b>${property}</b> on <b>${dates}</b> has been cancelled.</p><p>Please sign in to DigitalRidr if you need further details.</p>`,
          });
        }
        subject = "Booking cancelled";
        html = `<p>A booking for <b>${property}</b> (${dates}) has been cancelled by the ${isGuest ? "guest" : "host"}.</p><p>Reference: ${booking.payment_reference || booking.id}</p>`;
      }
    }

    const { error: emailError } = await new Resend(resendKey).emails.send({
      from: "DigitalRidr <onboarding@resend.dev>", to: recipients, subject, html,
    });
    if (emailError) throw emailError;
    return reply({ sent: true });
  } catch (error: any) {
    console.error("Admin notification error:", error.message);
    return reply({ error: "Unable to send notification" }, 500);
  }
});
