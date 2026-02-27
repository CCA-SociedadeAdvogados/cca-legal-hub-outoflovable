import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Authentication & Authorization ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: membership } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (["save_config", "delete_config"].includes(action) && !["admin", "superadmin", "owner"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── save_config ─────────────────────────────────────────────────────────
    if (action === "save_config") {
      const { bc_url, company_guid, company_name, is_enabled, sync_interval_minutes } = body;

      if (!bc_url || !company_guid) {
        return new Response(
          JSON.stringify({ error: "bc_url and company_guid are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("bc_config")
        .upsert({
          organization_id,
          bc_url: bc_url.trim().replace(/\/$/, ""),
          company_guid: company_guid.trim(),
          company_name: company_name || null,
          is_enabled: is_enabled ?? true,
          sync_interval_minutes: sync_interval_minutes || 60,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id" })
        .select()
        .single();

      if (error) {
        console.error("Error saving bc_config:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── delete_config ────────────────────────────────────────────────────────
    if (action === "delete_config") {
      // Fetch config ID first
      const { data: config } = await supabase
        .from("bc_config")
        .select("id")
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Config not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete cascades to bc_customers, bc_accounts, bc_ledger, bc_sync_logs
      const { error } = await supabase
        .from("bc_config")
        .delete()
        .eq("organization_id", organization_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── get_sync_status ──────────────────────────────────────────────────────
    if (action === "get_sync_status") {
      const { data: config } = await supabase
        .from("bc_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();

      const { data: logs } = await supabase
        .from("bc_sync_logs")
        .select("*")
        .eq("organization_id", organization_id)
        .order("started_at", { ascending: false })
        .limit(5);

      // Count cached records
      const { count: customerCount } = await supabase
        .from("bc_customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .eq("is_deleted", false);

      const { count: accountCount } = await supabase
        .from("bc_accounts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      const { count: ledgerCount } = await supabase
        .from("bc_ledger")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            config,
            logs: logs || [],
            counts: {
              customers: customerCount || 0,
              accounts: accountCount || 0,
              ledger_entries: ledgerCount || 0,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── fetch_customers ──────────────────────────────────────────────────────
    if (action === "fetch_customers") {
      const { search, limit = 100, offset = 0 } = body;

      let query = supabase
        .from("bc_customers")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("is_deleted", false)
        .order("display_name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (search) {
        const sanitized = search.replace(/[,.*()]/g, "");
        query = query.or(
          `display_name.ilike.%${sanitized}%,bc_number.ilike.%${sanitized}%,nif.ilike.%${sanitized}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data || [], count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── fetch_accounts ───────────────────────────────────────────────────────
    if (action === "fetch_accounts") {
      const { data, error } = await supabase
        .from("bc_accounts")
        .select("*")
        .eq("organization_id", organization_id)
        .order("account_number", { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── fetch_ledger ─────────────────────────────────────────────────────────
    if (action === "fetch_ledger") {
      const { customer_bc_id, customer_number, is_open, date_from, date_to, limit = 200, offset = 0 } = body;

      let query = supabase
        .from("bc_ledger")
        .select("*, bc_customers(display_name, bc_number, nif)")
        .eq("organization_id", organization_id)
        .order("posting_date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (customer_bc_id) {
        query = query.eq("customer_bc_id", customer_bc_id);
      }

      if (customer_number) {
        query = query.eq("customer_number", customer_number);
      }

      if (is_open !== undefined && is_open !== null) {
        query = query.eq("is_open", is_open);
      }

      if (date_from) {
        query = query.gte("posting_date", date_from);
      }

      if (date_to) {
        query = query.lte("posting_date", date_to);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
