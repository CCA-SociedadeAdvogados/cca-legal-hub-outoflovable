import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as _baseCorsHeaders } from "../_shared/cors.ts";

function corsHeaders(req: Request): Record<string, string> {
  const base = _baseCorsHeaders(req);
  return {
    ...base,
    "Access-Control-Allow-Headers": base["Access-Control-Allow-Headers"] + ", x-cron-secret",
  };
}

// Data Retention Cron Job
// Executes data retention policies and pending deletion requests
// SECURITY: Requires either CRON_SECRET header or platform admin authentication

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  // Only allow POST requests (from cron)
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
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

            // 2a. Atomic anonymisation in a single Postgres transaction.
            //     Either every table is updated, or nothing is.
            const { data: anonResult, error: anonError } = await supabase.rpc(
              "fn_anonymize_user_data",
              { p_user_id: userId },
            );
            if (anonError) {
              throw new Error(`fn_anonymize_user_data failed: ${anonError.message}`);
            }

            // 2b. Delete auth user (auth.users — must go through admin API).
            //     Profile is already anonymised; failing here is non-fatal.
            const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
            if (deleteUserError) {
              console.error(`[Data-Retention-Cron] Delete auth user error: ${deleteUserError.message}`);
            }

            // 2c. Mark DSAR request as completed
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
              anon_result: anonResult,
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
