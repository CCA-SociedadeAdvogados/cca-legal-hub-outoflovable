import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Data Retention Cron Job
// Executes data retention policies and pending deletion requests
// SECURITY: Requires either CRON_SECRET header or platform admin authentication

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Only allow POST requests (from cron)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    // SECURITY: This function can only be called by:
    // 1. Cron jobs with a valid CRON_SECRET
    // 2. Platform admins with a valid auth token
    
    const providedCronSecret = req.headers.get("X-Cron-Secret");
    const authHeader = req.headers.get("Authorization");
    
    let isAuthorized = false;
    
    // Check for cron secret first (for automated calls)
    if (cronSecret && providedCronSecret && providedCronSecret === cronSecret) {
      console.log("[Data-Retention-Cron] Authorized via cron secret");
      isAuthorized = true;
    }
    
    // If no cron secret match, check for platform admin auth
    if (!isAuthorized && authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
      if (!authError && caller) {
        // Check if caller is platform admin
        const supabaseCheck = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        
        const { data: isPlatformAdmin } = await supabaseCheck.rpc("is_platform_admin", { _user_id: caller.id });
        if (isPlatformAdmin) {
          console.log("[Data-Retention-Cron] Authorized via platform admin:", caller.email);
          isAuthorized = true;
        }
      }
    }
    
    if (!isAuthorized) {
      console.error("[Data-Retention-Cron] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Cron secret or platform admin access required" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Record<string, unknown> = {
      executed_at: new Date().toISOString(),
      retention_results: [],
      deletion_results: [],
      errors: [],
    };

    console.log("[Data-Retention-Cron] Starting data retention job");

    // 1. Execute data retention policies
    try {
      const { data: retentionResult, error: retentionError } = await supabase
        .rpc("execute_data_retention");

      if (retentionError) {
        console.error(`[Data-Retention-Cron] Retention error: ${retentionError.message}`);
        (results.errors as unknown[]).push({ step: "retention", error: retentionError.message });
      } else {
        results.retention_results = retentionResult || [];
        console.log(`[Data-Retention-Cron] Retention completed: ${JSON.stringify(retentionResult)}`);
      }
    } catch (e) {
      console.error(`[Data-Retention-Cron] Retention exception: ${e}`);
      (results.errors as unknown[]).push({ step: "retention", error: String(e) });
    }

    // 2. Process pending deletion requests that have passed grace period
    try {
      const { data: pendingDeletions, error: fetchError } = await supabase
        .from("dsar_requests")
        .select("*")
        .eq("request_type", "deletion")
        .eq("status", "pending")
        .lte("scheduled_execution_at", new Date().toISOString());

      if (fetchError) {
        console.error(`[Data-Retention-Cron] Fetch deletions error: ${fetchError.message}`);
        (results.errors as unknown[]).push({ step: "fetch_deletions", error: fetchError.message });
      } else if (pendingDeletions && pendingDeletions.length > 0) {
        console.log(`[Data-Retention-Cron] Processing ${pendingDeletions.length} deletion requests`);

        for (const deletion of pendingDeletions) {
          try {
            const userId = deletion.user_id;
            console.log(`[Data-Retention-Cron] Processing deletion for user: ${userId}`);

            // 2a. Anonymize audit logs (keep for legal compliance, remove PII)
            await supabase
              .from("audit_logs")
              .update({ 
                user_email: "DELETED_USER",
                metadata: { anonymized: true, original_user_id: userId, anonymized_at: new Date().toISOString() }
              })
              .eq("user_id", userId);

            // 2b. Anonymize auth activity logs
            await supabase
              .from("auth_activity_logs")
              .update({ 
                ip_address: null,
                user_agent: null,
                metadata: { anonymized: true }
              })
              .eq("user_id", userId);

            // 2c. Delete notifications
            await supabase
              .from("notifications")
              .delete()
              .eq("user_id", userId);

            // 2d. Delete user consents
            await supabase
              .from("user_consents")
              .delete()
              .eq("user_id", userId);

            // 2e. Anonymize contracts (keep for legal, remove creator reference)
            await supabase
              .from("contratos")
              .update({ 
                created_by_id: null,
                updated_by_id: null,
                responsavel_interno_id: null,
              })
              .or(`created_by_id.eq.${userId},updated_by_id.eq.${userId},responsavel_interno_id.eq.${userId}`);

            // 2f. Anonymize other tables with user references
            await supabase
              .from("templates")
              .update({ created_by_id: null, updated_by_id: null })
              .or(`created_by_id.eq.${userId},updated_by_id.eq.${userId}`);

            await supabase
              .from("documentos_gerados")
              .update({ created_by_id: null })
              .eq("created_by_id", userId);

            // 2g. Remove organization memberships
            await supabase
              .from("organization_members")
              .delete()
              .eq("user_id", userId);

            // 2h. Update profile to anonymized state
            await supabase
              .from("profiles")
              .update({
                email: `deleted_${userId.substring(0, 8)}@deleted.local`,
                nome_completo: "Utilizador Eliminado",
                avatar_url: null,
                departamento: null,
                sso_external_id: null,
                sso_provider: null,
              })
              .eq("id", userId);

            // 2i. Delete auth user (this removes from auth.users)
            const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
            if (deleteUserError) {
              console.error(`[Data-Retention-Cron] Delete user error: ${deleteUserError.message}`);
              // Continue even if auth deletion fails - profile is already anonymized
            }

            // 2j. Update DSAR request status
            await supabase
              .from("dsar_requests")
              .update({ 
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", deletion.id);

            (results.deletion_results as unknown[]).push({
              request_id: deletion.id,
              user_id: userId,
              status: "completed",
            });

            console.log(`[Data-Retention-Cron] Deletion completed for user: ${userId}`);

          } catch (e) {
            console.error(`[Data-Retention-Cron] Deletion error for ${deletion.id}: ${e}`);
            
            // Mark as failed
            await supabase
              .from("dsar_requests")
              .update({ 
                status: "failed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", deletion.id);

            (results.deletion_results as unknown[]).push({
              request_id: deletion.id,
              user_id: deletion.user_id,
              status: "failed",
              error: String(e),
            });
          }
        }
      }
    } catch (e) {
      console.error(`[Data-Retention-Cron] Deletions exception: ${e}`);
      (results.errors as unknown[]).push({ step: "deletions", error: String(e) });
    }

    // 3. Log execution summary
    await supabase.from("audit_logs").insert([{
      user_id: "00000000-0000-0000-0000-000000000000", // System user
      action: "DATA_RETENTION_CRON",
      table_name: "system",
      new_data: results,
      metadata: { type: "scheduled_job" },
    }]);

    console.log(`[Data-Retention-Cron] Job completed: ${JSON.stringify(results)}`);

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error(`[Data-Retention-Cron] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro ao executar job de retenção.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
