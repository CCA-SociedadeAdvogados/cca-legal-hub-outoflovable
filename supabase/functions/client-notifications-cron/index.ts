import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * client-notifications-cron
 *
 * Gera notificações proativas para os clientes (prazos de contrato: termo e
 * decisão de renovação a aproximarem-se). Pensada para correr diariamente via
 * GitHub Action (header x-cron-secret == NAV_SYNC_SECRET). Também aceita a
 * service role para invocação manual.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const cronSecret = Deno.env.get("NAV_SYNC_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const isCron = !!cronSecret && providedSecret === cronSecret;

    const authHeader = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isService = !!serviceKey && authHeader === serviceKey;

    if (!isCron && !isService) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase.rpc("fn_create_client_deadline_notifications");
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, created: data ?? 0 }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[client-notifications-cron] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
