// scripts/bc-sync/sync.js
// Runs once, syncs BC customers to Supabase bc_customers table, then exits.
// Schedule with PM2, cron, or Windows Task Scheduler.
//
// Usage:
//   cp .env.example .env   # fill in credentials
//   npm install
//   node sync.js
//
// PM2 cron example (every 6 hours):
//   pm2 start sync.js --name bc-sync --cron "0 */6 * * *" --no-autorestart

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const required = ["BC_USERNAME", "BC_PASSWORD", "BC_BASE_URL", "BC_COMPANY_GUID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const { BC_USERNAME, BC_PASSWORD, BC_BASE_URL, BC_COMPANY_GUID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const basicAuth = Buffer.from(`${BC_USERNAME}:${BC_PASSWORD}`).toString("base64");

async function fetchAllCustomers() {
  let customers = [];
  let url = `${BC_BASE_URL}/BC140WS/api/arq/payme/v1.0/companies(${BC_COMPANY_GUID})/customers`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`BC API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    customers = customers.concat(json.value ?? []);
    url = json["@odata.nextLink"] ?? null;
  }
  return customers;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting BC sync...`);

  const customers = await fetchAllCustomers();
  console.log(`Fetched ${customers.length} customers from BC`);

  if (!customers.length) {
    console.log("Nothing to sync.");
    return;
  }

  const rows = customers.map((c) => ({
    bc_id: c.id,
    number: c.number ?? c.no ?? "",
    display_name: c.displayName ?? c.name ?? "",
    email: c.email ?? "",
    phone_number: c.phoneNumber ?? "",
    address: c.address ?? null,
    city: c.city ?? "",
    country: c.country ?? "",
    currency_code: c.currencyCode ?? "",
    credit_limit: c.creditLimit ?? null,
    balance: c.balance ?? null,
    blocked: c.blocked ?? "",
    raw: c,
    synced_at: new Date().toISOString(),
  }));

  const BATCH = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from("bc_customers")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "bc_id" });
    if (error) throw new Error(`Supabase upsert: ${error.message}`);
    total += Math.min(BATCH, rows.length - i);
  }

  console.log(`[${new Date().toISOString()}] Done. ${total} customers upserted.`);
}

main().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
