import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;

const extensionFor = (file: File) => {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response({ error: "Verification service is not configured" }, 500);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "Please sign in before submitting verification" }, 401);

  try {
    const form = await req.formData();
    const idDocument = form.get("idDocument");
    const selfie = form.get("selfie");
    if (!(idDocument instanceof File) || !(selfie instanceof File)) {
      return response({ error: "Please provide both an ID document and a selfie" }, 400);
    }

    for (const file of [idDocument, selfie]) {
      if (!allowedTypes.has(file.type)) return response({ error: "Only JPG, PNG, or WebP images are accepted" }, 400);
      if (file.size === 0 || file.size > maxFileSize) return response({ error: "Each image must be no larger than 5 MB" }, 400);
    }

    const submissionId = crypto.randomUUID();
    const userId = authData.user.id;
    const idPath = `${userId}/identity/${submissionId}.${extensionFor(idDocument)}`;
    const selfiePath = `${userId}/selfie/${submissionId}.${extensionFor(selfie)}`;

    const [idUpload, selfieUpload] = await Promise.all([
      supabase.storage.from("secure-documents").upload(idPath, idDocument, { contentType: idDocument.type, upsert: false }),
      supabase.storage.from("secure-documents").upload(selfiePath, selfie, { contentType: selfie.type, upsert: false }),
    ]);
    if (idUpload.error || selfieUpload.error) {
      console.error("Verification upload error:", idUpload.error?.message || selfieUpload.error?.message);
      return response({ error: "Secure document storage is unavailable. Please try again shortly." }, 503);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        identity_doc_url: idPath,
        selfie_url: selfiePath,
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    return response({ success: true });
  } catch (error: any) {
    console.error("Verification submission error:", error.message);
    return response({ error: "Unable to submit verification. Please try again." }, 500);
  }
});
