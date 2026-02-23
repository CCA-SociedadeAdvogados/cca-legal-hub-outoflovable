import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GDPR Article 15 - Right of Access
// This edge function exports all user data in machine-readable format

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

    const userId = user.id;
    const userEmail = user.email;
    console.log(`[User-Data-Export] Export request from user: ${userId}`);

    // Use service role to access all user data across tables
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const exportData: Record<string, unknown> = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail,
        format: "JSON",
        gdpr_article: "Article 15 - Right of Access",
      },
    };

    // 1. Profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (profile) {
      exportData.profile = {
        id: profile.id,
        email: profile.email,
        nome_completo: profile.nome_completo,
        avatar_url: profile.avatar_url,
        departamento: profile.departamento,
        auth_method: profile.auth_method,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_login_at: profile.last_login_at,
        onboarding_completed: profile.onboarding_completed,
        two_factor_enabled: profile.two_factor_enabled,
      };
    }

    // 2. Organization memberships
    const { data: memberships } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        created_at,
        organizations:organization_id (
          id,
          name,
          slug
        )
      `)
      .eq("user_id", userId);
    
    exportData.organization_memberships = memberships || [];

    // 3. User consents
    const { data: consents } = await supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    exportData.consents = consents || [];

    // 4. Notifications (user's own)
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, type, title, message, read, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    
    exportData.notifications = notifications || [];

    // 5. Auth activity logs (user's own)
    const { data: authLogs } = await supabase
      .from("auth_activity_logs")
      .select("id, auth_method, action, success, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    
    exportData.auth_activity = authLogs || [];

    // 6. Audit logs where user was the actor (limited, anonymized other users)
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("id, action, table_name, record_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    
    exportData.activity_history = auditLogs || [];

    // 7. Contracts created by user (only metadata, not full content for privacy)
    const { data: contracts } = await supabase
      .from("contratos")
      .select("id, id_interno, titulo_contrato, estado_contrato, created_at")
      .eq("created_by_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    
    exportData.contracts_created = contracts || [];

    // 8. Templates created by user
    const { data: templates } = await supabase
      .from("templates")
      .select("id, nome, tipo, descricao, created_at")
      .eq("created_by_id", userId)
      .limit(100);
    
    exportData.templates_created = templates || [];

    // 9. Documents created by user
    const { data: documents } = await supabase
      .from("documentos_gerados")
      .select("id, nome, tipo, estado_assinatura, created_at")
      .eq("created_by_id", userId)
      .limit(100);
    
    exportData.documents_created = documents || [];

    // 10. Data subject access request history
    const { data: dsarHistory } = await supabase
      .from("dsar_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    exportData.dsar_history = dsarHistory || [];

    // Record this export request in DSAR table
    await supabase.from("dsar_requests").insert([{
      user_id: userId,
      request_type: "export",
      status: "completed",
      completed_at: new Date().toISOString(),
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent")?.substring(0, 500) || null,
    }]);

    // Log in audit
    await supabase.from("audit_logs").insert([{
      user_id: userId,
      user_email: userEmail,
      action: "DATA_EXPORT",
      table_name: "profiles",
      record_id: userId,
      new_data: { export_type: "full_user_data", tables_exported: Object.keys(exportData).length },
      metadata: { gdpr_article: "15", ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() },
    }]);

    console.log(`[User-Data-Export] Export completed for user: ${userId}, tables: ${Object.keys(exportData).length}`);

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        headers: { 
          ...getCorsHeaders(req), 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="my-data-export-${new Date().toISOString().split("T")[0]}.json"`,
        },
      }
    );

  } catch (error: unknown) {
    console.error(`[User-Data-Export] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro ao exportar dados. Tente novamente.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
