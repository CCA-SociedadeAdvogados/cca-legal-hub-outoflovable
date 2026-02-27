import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BC_USERNAME = Deno.env.get("BC_USERNAME")!;
const BC_PASSWORD = Deno.env.get("BC_PASSWORD")!;
const BC_BASE_URL = Deno.env.get("BC_BASE_URL")!;
const BC_COMPANY_GUID = Deno.env.get("BC_COMPANY_GUID")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required env vars
    if (!BC_USERNAME || !BC_PASSWORD || !BC_BASE_URL || !BC_COMPANY_GUID) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing BC environment variables. Configure BC_USERNAME, BC_PASSWORD, BC_BASE_URL and BC_COMPANY_GUID in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const basicAuth = btoa(`${BC_USERNAME}:${BC_PASSWORD}`);

    // Fetch all customers from BC (paginated via @odata.nextLink)
    let customers: Record<string, unknown>[] = [];
    let url: string | null = `${BC_BASE_URL}/BC140WS/api/arq/payme/v1.0/companies(${BC_COMPANY_GUID})/customers`;

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`BC API error ${response.status}: ${text}`);
      }

      const json = await response.json();
      const page: Record<string, unknown>[] = json.value ?? [];
      customers = customers.concat(page);
      url = (json["@odata.nextLink"] as string) ?? null;
    }

    console.log(`Fetched ${customers.length} customers from BC`);

    if (customers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, upserted: 0, message: "No customers returned from BC" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map BC fields to bc_customers columns
    const rows = customers.map((c) => ({
      bc_id: c.id as string,
      number: (c.number ?? c.no ?? "") as string,
      display_name: (c.displayName ?? c.name ?? "") as string,
      email: (c.email ?? "") as string,
      phone_number: (c.phoneNumber ?? "") as string,
      address: (c.address ?? null) as unknown,
      city: (c.city ?? "") as string,
      country: (c.country ?? "") as string,
      currency_code: (c.currencyCode ?? "") as string,
      credit_limit: (c.creditLimit ?? null) as number | null,
      balance: (c.balance ?? null) as number | null,
      blocked: (c.blocked ?? "") as string,
      raw: c,
      synced_at: new Date().toISOString(),
    }));

    // Upsert in batches of 100
    const BATCH = 100;
    let totalUpserted = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("bc_customers")
        .upsert(batch, { onConflict: "bc_id" });

      if (error) throw new Error(`Supabase upsert error: ${error.message}`);
      totalUpserted += batch.length;
    }

    console.log(`Upserted ${totalUpserted} customers`);

    return new Response(
      JSON.stringify({ success: true, upserted: totalUpserted, message: `${totalUpserted} clientes sincronizados do Business Central` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("bc-sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
