import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
// Grace period before permanent deletion (days)
const DELETION_GRACE_PERIOD_DAYS = 7;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Token de autenticação necessário." }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify token and get user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Sessão inválida ou expirada." }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let body: { action: string; password?: string; reason?: string; request_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const { action, password, reason, request_id } = body;
    const userId = user.id;
    const userEmail = user.email || "";

    console.log(`[User-Data-Deletion] Action: ${action} from user: ${userId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "request": {
        if (!password) {
          return new Response(
            JSON.stringify({ error: "password_required", message: "Por favor, confirme a sua palavra-passe." }),
            {
              status: 400,
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (signInError) {
          await supabase.from("auth_activity_logs").insert([{
            user_id: userId,
            auth_method: "local",
            action: "deletion_request_failed",
            success: false,
            metadata: { reason: "password_verification_failed" },
          }]);

          return new Response(
            JSON.stringify({ error: "password_invalid", message: "Palavra-passe incorreta." }),
            {
              status: 401,
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        const scheduledDeletionAt = new Date();
        scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + DELETION_GRACE_PERIOD_DAYS);

        const { data: dsarRequest, error: insertError } = await supabase
          .from("dsar_requests")
          .insert([{
            user_id: userId,
            request_type: "deletion",
            status: "pending",
            reason: reason || null,
            scheduled_execution_at: scheduledDeletionAt.toISOString(),
            ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
            user_agent: req.headers.get("user-agent")?.substring(0, 500) || null,
          }])
          .select()
          .single();

        if (insertError) {
          console.error(`[User-Data-Deletion] Insert error: ${insertError.message}`);
          throw new Error("Failed to create deletion request");
        }

        await supabase.from("audit_logs").insert([{
          user_id: userId,
          user_email: userEmail,
          action: "DELETION_REQUESTED",
          table_name: "dsar_requests",
          record_id: dsarRequest.id,
          new_data: { 
            scheduled_deletion_at: scheduledDeletionAt.toISOString(),
            grace_period_days: DELETION_GRACE_PERIOD_DAYS,
          },
          metadata: { gdpr_article: "17" },
        }]);

        console.log(`[User-Data-Deletion] Request created: ${dsarRequest.id}, scheduled for: ${scheduledDeletionAt.toISOString()}`);

        return new Response(
          JSON.stringify({
            success: true,
            request_id: dsarRequest.id,
            scheduled_deletion_at: scheduledDeletionAt.toISOString(),
            grace_period_days: DELETION_GRACE_PERIOD_DAYS,
            message: `O pedido de eliminação foi registado. A sua conta será eliminada em ${DELETION_GRACE_PERIOD_DAYS} dias. Pode cancelar este pedido durante este período.`,
          }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      case "cancel": {
        if (!request_id) {
          return new Response(
            JSON.stringify({ error: "request_id_required" }),
            {
              status: 400,
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        const { data: existingRequest } = await supabase
          .from("dsar_requests")
          .select("*")
          .eq("id", request_id)
          .eq("user_id", userId)
          .eq("request_type", "deletion")
          .eq("status", "pending")
          .single();

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ error: "request_not_found", message: "Pedido não encontrado ou já processado." }),
            {
              status: 404,
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        await supabase
          .from("dsar_requests")
          .update({ 
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("id", request_id);

        await supabase.from("audit_logs").insert([{
          user_id: userId,
          user_email: userEmail,
          action: "DELETION_CANCELLED",
          table_name: "dsar_requests",
          record_id: request_id,
        }]);

        console.log(`[User-Data-Deletion] Request cancelled: ${request_id}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: "O pedido de eliminação foi cancelado com sucesso.",
          }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      case "status": {
        const { data: requests } = await supabase
          .from("dsar_requests")
          .select("*")
          .eq("user_id", userId)
          .eq("request_type", "deletion")
          .order("created_at", { ascending: false })
          .limit(5);

        return new Response(
          JSON.stringify({
            requests: requests || [],
            has_pending: requests?.some(r => r.status === "pending") || false,
          }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      case "execute": {
        return new Response(
          JSON.stringify({ error: "not_implemented", message: "Execução automática via cron job." }),
          {
            status: 501,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "invalid_action" }),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
    }

  } catch (error: unknown) {
    console.error(`[User-Data-Deletion] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro ao processar pedido. Tente novamente.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});