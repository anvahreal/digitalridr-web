import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-event-secret",
};
const events = ["new_user", "identity_verification", "host_application", "manual_booking", "paid_booking", "payout_request", "booking_cancelled"] as const;
type Event = typeof events[number];
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
const money = (value: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value));
const same = (a: string, b: string) => a.length > 0 && a.length === b.length && [...a].reduce((result, char, index) => result | (char.charCodeAt(0) ^ b.charCodeAt(index)), 0) === 0;
const emailForUser = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  return error ? undefined : data.user?.email;
};

const adminEmails = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase.from("profiles").select("id").eq("is_admin", true);
  if (error) throw error;
  const profileEmails = await Promise.all((data || []).map(({ id }) => emailForUser(supabase, id)));
  const configured = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map((email) => email.trim()).filter(Boolean);
  return [...new Set([...profileEmails, ...configured].filter((email): email is string => Boolean(email)))];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!url || !serviceKey || !resendKey) return reply({ error: "Email service is not configured" }, 500);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const databaseSecret = req.headers.get("x-admin-event-secret") || "";
  const supabase = createClient(url, serviceKey);
  // The database-created signup trigger authenticates with a Vault value. The
  // RPC is executable by the service role only, so it never exposes that value
  // to browsers or ordinary authenticated users.
  const { data: vaultSecret } = await supabase.rpc("get_admin_notification_webhook_secret");
  const internal = same(token, serviceKey) || same(databaseSecret, typeof vaultSecret === "string" ? vaultSecret : "");
  let callerId: string | undefined;
  if (!internal) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return reply({ error: "Unauthorized" }, 401);
    callerId = data.user.id;
  }

  try {
    const { event, resourceId } = await req.json() as { event?: Event; resourceId?: string };
    if (!resourceId || !events.includes(event as Event)) return reply({ error: "Invalid notification event" }, 400);
    const recipients = await adminEmails(supabase);
    if (!recipients.length) return reply({ sent: false, reason: "No admin email recipients configured" });

    let subject: string;
    let html: string;
    if (event === "new_user") {
      if (callerId && callerId !== resourceId) return reply({ error: "User not found" }, 404);
      const { data: user, error } = await supabase.auth.admin.getUserById(resourceId);
      if (error || !user.user) return reply({ error: "User not found" }, 404);
      subject = "New DigitalRidr user registered";
      html = `<p>New account: <b>${user.user.user_metadata?.full_name || "Not provided"}</b> (${user.user.email || "No email"}).</p>`;
    } else if (event === "identity_verification" || event === "host_application") {
      if (callerId && callerId !== resourceId) return reply({ error: "Application not found" }, 404);
      const { data: profile, error } = await supabase.from("profiles").select("full_name, phone_number, host_status, verification_status").eq("id", resourceId).single();
      if (error || !profile || (event === "host_application" && profile.host_status !== "pending") || (event === "identity_verification" && profile.verification_status !== "pending")) return reply({ error: "Application not found" }, 404);
      const userEmail = await emailForUser(supabase, resourceId);
      subject = event === "host_application" ? "New host application requires review" : "New identity verification requires review";
      html = `<p><b>${profile.full_name || "User"}</b> (${userEmail || "No email"}) requires review.${event === "host_application" ? `<br />Phone: ${profile.phone_number || "Not provided"}` : ""}</p>`;
    } else if (event === "payout_request") {
      const { data: payout, error } = await supabase.from("payout_requests").select("user_id, amount, bank_name, account_number").eq("id", resourceId).single();
      if (error || !payout || (callerId && payout.user_id !== callerId)) return reply({ error: "Payout request not found" }, 404);
      subject = "New payout request requires review";
      html = `<p>Amount: <b>${money(payout.amount)}</b><br />Bank: ${payout.bank_name || "Not provided"}<br />Account: ${payout.account_number || "Not provided"}</p>`;
    } else {
      const { data: booking, error } = await supabase.from("bookings").select("guest_id, host_id, listing_id, total_price, payment_reference, status, check_in, check_out").eq("id", resourceId).single();
      if (error || !booking) return reply({ error: "Booking not found" }, 404);
      const guest = booking.guest_id === callerId;
      const host = booking.host_id === callerId;
      if ((event === "manual_booking" && callerId && !guest) || (event === "booking_cancelled" && callerId && !guest && !host) || (event === "paid_booking" && callerId)) return reply({ error: "Unauthorized" }, 401);
      const { data: listing } = await supabase.from("listings").select("title").eq("id", booking.listing_id).maybeSingle();
      const detail = `<p><b>Property:</b> ${listing?.title || "A property"}<br /><b>Dates:</b> ${new Date(booking.check_in).toLocaleDateString("en-NG")} – ${new Date(booking.check_out).toLocaleDateString("en-NG")}<br /><b>Total:</b> ${money(booking.total_price)}<br /><b>Reference:</b> ${booking.payment_reference || resourceId}</p>`;
      subject = event === "manual_booking" ? "New bank-transfer booking requires review" : event === "paid_booking" ? "New paid booking confirmed" : "Booking cancelled";
      html = event === "paid_booking" ? `<p>KoraPay has confirmed a booking payment.</p>${detail}` : detail;
      if (event === "booking_cancelled") {
        const recipientId = guest ? booking.host_id : booking.guest_id;
        const { data: recipient } = await supabase.from("profiles").select("full_name").eq("id", recipientId).maybeSingle();
        const recipientEmail = await emailForUser(supabase, recipientId);
        if (recipientEmail) await new Resend(resendKey).emails.send({ from: Deno.env.get("EMAIL_FROM") || "DigitalRidr <onboarding@resend.dev>", to: [recipientEmail], subject, html: `<p>Hi ${recipient?.full_name || "there"},</p><p>A booking has been cancelled.</p>${detail}` });
      }
    }

    const { error } = await new Resend(resendKey).emails.send({ from: Deno.env.get("EMAIL_FROM") || "DigitalRidr <onboarding@resend.dev>", to: recipients, subject, html });
    if (error) throw error;
    return reply({ sent: true, recipients: recipients.length });
  } catch (error: unknown) {
    console.error("Admin notification error:", error instanceof Error ? error.message : String(error));
    return reply({ error: "Unable to send notification" }, 500);
  }
});
