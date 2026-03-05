import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function para obter a foto de perfil de um utilizador do Azure AD
 * via Microsoft Graph API usando client credentials flow.
 *
 * Requer as seguintes secrets:
 * - SHAREPOINT_TENANT_ID: Azure AD tenant ID
 * - SHAREPOINT_CLIENT_ID: App registration client ID (com User.Read.All permission)
 * - SHAREPOINT_CLIENT_SECRET: Client secret
 *
 * Body: { sso_external_id: string, force?: boolean }
 * Response: { photo_url: string | null }
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sso_external_id, force } = await req.json();

    if (!sso_external_id) {
      return new Response(
        JSON.stringify({ error: "sso_external_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has avatar and force is not set
    if (!force) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.avatar_url) {
        return new Response(
          JSON.stringify({ photo_url: profile.avatar_url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get Microsoft Graph access token using client credentials
    const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
    const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
    const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");

    if (!tenantId || !clientId || !clientSecret) {
      console.warn("[fetch-azure-photo] Microsoft Graph credentials not configured");
      return new Response(
        JSON.stringify({ photo_url: null, reason: "Graph API credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[fetch-azure-photo] Failed to get Graph token:", await tokenResponse.text());
      return new Response(
        JSON.stringify({ photo_url: null, reason: "Failed to authenticate with Graph API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const graphToken = tokenData.access_token;

    // Fetch user photo from Microsoft Graph
    // Uses /users/{oid}/photo/$value (requires User.Read.All app permission)
    const photoUrl = `https://graph.microsoft.com/v1.0/users/${sso_external_id}/photo/$value`;
    const photoResponse = await fetch(photoUrl, {
      headers: { Authorization: `Bearer ${graphToken}` },
    });

    if (!photoResponse.ok) {
      const status = photoResponse.status;
      console.warn(`[fetch-azure-photo] Graph API photo not found (${status}) for OID: ${sso_external_id}`);
      return new Response(
        JSON.stringify({ photo_url: null, reason: `Photo not available (HTTP ${status})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert photo to base64 data URL
    const photoBuffer = await photoResponse.arrayBuffer();
    const contentType = photoResponse.headers.get("Content-Type") || "image/jpeg";
    const base64 = btoa(
      new Uint8Array(photoBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Upload to Supabase Storage
    const filePath = `${user.id}/avatar-azure.${contentType.includes("png") ? "png" : "jpg"}`;
    const fileBlob = new Blob([new Uint8Array(photoBuffer)], { type: contentType });

    const { error: uploadError } = await supabase.storage
      .from("contratos")
      .upload(filePath, fileBlob, { upsert: true, contentType });

    if (uploadError) {
      console.error("[fetch-azure-photo] Upload error:", uploadError);
      // Fall back to data URL
      const dataUrl = `data:${contentType};base64,${base64}`;
      return new Response(
        JSON.stringify({ photo_url: dataUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("contratos")
      .getPublicUrl(filePath);

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ photo_url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[fetch-azure-photo] Unexpected error:", err);
    return new Response(
      JSON.stringify({ photo_url: null, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
