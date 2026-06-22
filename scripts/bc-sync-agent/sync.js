/**
 * Business Central Sync Agent
 * ============================
 * Corre na rede interna da empresa.
 * Lê dados do Business Central 14.0 (on-premises) via API OData v4
 * e sincroniza para as tabelas Supabase (bc_customers, bc_accounts, bc_ledger).
 *
 * Requisitos:
 *   Node.js >= 18
 *   npm install (instala @supabase/supabase-js e dotenv)
 *
 * Uso:
 *   node sync.js              # sync completo
 *   node sync.js --dry-run    # simula sem gravar no Supabase
 *
 * Agendamento (Windows):
 *   schtasks /create /sc hourly /tn "BC Sync" /tr "node C:\bc-sync-agent\sync.js"
 *
 * Agendamento (Linux/macOS cron):
 *   0 * * * * cd /path/to/bc-sync-agent && node sync.js >> /var/log/bc-sync.log 2>&1
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// ─── Config from .env ─────────────────────────────────────────────────────────
const BC_URL = process.env.BC_URL;
const BC_COMPANY_GUID = process.env.BC_COMPANY_GUID;
const BC_USERNAME = process.env.BC_USERNAME;
const BC_PASSWORD = process.env.BC_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID;
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Validation ───────────────────────────────────────────────────────────────
const requiredVars = ["BC_URL", "BC_COMPANY_GUID", "BC_USERNAME", "BC_PASSWORD", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ORGANIZATION_ID"];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`[ERROR] Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildAuthHeader() {
  const credentials = Buffer.from(`${BC_USERNAME}:${BC_PASSWORD}`).toString("base64");
  return `Basic ${credentials}`;
}

function buildApiUrl(entity) {
  return `${BC_URL}/api/arq/payme/v1.0/companies(${BC_COMPANY_GUID})/${entity}`;
}

/**
 * Fetch all pages of an OData endpoint (handles @odata.nextLink pagination)
 */
async function fetchAllPages(entity) {
  const results = [];
  let url = buildApiUrl(entity);

  while (url) {
    console.log(`  [FETCH] GET ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status} fetching ${entity}: ${body}`);
    }

    const data = await response.json();
    const items = data.value || [];
    results.push(...items);
    console.log(`  [FETCH] Got ${items.length} records (total so far: ${results.length})`);

    // Follow @odata.nextLink if present
    url = data["@odata.nextLink"] || null;
  }

  return results;
}

// ─── BC Config lookup ─────────────────────────────────────────────────────────
async function getBCConfig() {
  const { data, error } = await supabase
    .from("bc_config")
    .select("id")
    .eq("organization_id", ORGANIZATION_ID)
    .maybeSingle();

  if (error) throw new Error(`Failed to get bc_config: ${error.message}`);
  return data;
}

// ─── Sync Customers ───────────────────────────────────────────────────────────
async function syncCustomers(configId) {
  console.log("\n[CUSTOMERS] Fetching customers from BC...");
  const bcCustomers = await fetchAllPages("customers");
  console.log(`[CUSTOMERS] Found ${bcCustomers.length} customers`);

  if (DRY_RUN) {
    console.log("[DRY-RUN] Skipping upsert for customers");
    return bcCustomers.length;
  }

  const records = bcCustomers.map((c) => ({
    organization_id: ORGANIZATION_ID,
    config_id: configId,
    bc_id: c.id,
    bc_number: c.number || null,
    display_name: c.displayName || c.name || "",
    nif: c.taxRegistrationNumber || null,
    address: c.addressLine1 || c.address?.street || null,
    city: c.city || c.address?.city || null,
    country: c.country || c.address?.country || null,
    post_code: c.postalCode || c.address?.postalCode || null,
    phone: c.phoneNumber || null,
    email: c.email || null,
    balance: c.balance !== undefined ? c.balance : null,
    credit_limit: c.creditLimitLCY !== undefined ? c.creditLimitLCY : null,
    payment_terms_code: c.paymentTermsCode || null,
    currency_code: c.currencyCode || "EUR",
    customer_posting_group: c.customerPostingGroup || null,
    bc_last_modified: c.lastModifiedDateTime || null,
    is_deleted: false,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase
      .from("bc_customers")
      .upsert(batch, { onConflict: "config_id,bc_id" });

    if (error) throw new Error(`Failed to upsert customers batch: ${error.message}`);
    console.log(`[CUSTOMERS] Upserted batch ${Math.floor(i / 100) + 1} (${batch.length} records)`);
  }

  return bcCustomers.length;
}

// ─── Sync Accounts ────────────────────────────────────────────────────────────
async function syncAccounts(configId) {
  console.log("\n[ACCOUNTS] Fetching accounts (Account) from BC...");
  const bcAccounts = await fetchAllPages("Account");
  console.log(`[ACCOUNTS] Found ${bcAccounts.length} accounts`);

  if (DRY_RUN) {
    console.log("[DRY-RUN] Skipping upsert for accounts");
    return bcAccounts.length;
  }

  const records = bcAccounts.map((a) => ({
    organization_id: ORGANIZATION_ID,
    config_id: configId,
    bc_id: a.id,
    account_number: a.number || null,
    display_name: a.displayName || a.name || "",
    account_category: a.category || null,
    account_sub_category: a.subCategory || null,
    balance: a.balance !== undefined ? a.balance : null,
    account_type: a.accountType || null,
    blocked: a.blocked || false,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase
      .from("bc_accounts")
      .upsert(batch, { onConflict: "config_id,bc_id" });

    if (error) throw new Error(`Failed to upsert accounts batch: ${error.message}`);
    console.log(`[ACCOUNTS] Upserted batch ${Math.floor(i / 100) + 1} (${batch.length} records)`);
  }

  return bcAccounts.length;
}

// ─── Sync Ledger ──────────────────────────────────────────────────────────────
async function syncLedger(configId) {
  console.log("\n[LEDGER] Fetching arq_ledger from BC...");
  const bcLedger = await fetchAllPages("arq_ledger");
  console.log(`[LEDGER] Found ${bcLedger.length} ledger entries`);

  if (DRY_RUN) {
    console.log("[DRY-RUN] Skipping upsert for ledger");
    return bcLedger.length;
  }

  // Build customer number → Supabase customer ID map
  const { data: supaCustomers } = await supabase
    .from("bc_customers")
    .select("id, bc_number")
    .eq("organization_id", ORGANIZATION_ID);

  const customerNumberToId = {};
  for (const c of supaCustomers || []) {
    if (c.bc_number) customerNumberToId[c.bc_number] = c.id;
  }

  const records = bcLedger.map((e) => ({
    organization_id: ORGANIZATION_ID,
    config_id: configId,
    bc_entry_number: e.entryNo || e.entryNumber || null,
    customer_bc_id: customerNumberToId[e.customerNo || e.customerNumber] || null,
    customer_number: e.customerNo || e.customerNumber || null,
    posting_date: e.postingDate ? e.postingDate.split("T")[0] : null,
    document_type: e.documentType || null,
    document_number: e.documentNo || e.documentNumber || null,
    description: e.description || null,
    amount: e.amount !== undefined ? e.amount : null,
    remaining_amount: e.remainingAmount !== undefined ? e.remainingAmount : null,
    due_date: e.dueDate ? e.dueDate.split("T")[0] : null,
    currency_code: e.currencyCode || "EUR",
    is_open: e.open !== undefined ? e.open : (e.remainingAmount > 0),
    posting_group: e.customerPostingGroup || null,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })).filter((r) => r.bc_entry_number !== null);

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase
      .from("bc_ledger")
      .upsert(batch, { onConflict: "config_id,bc_entry_number" });

    if (error) throw new Error(`Failed to upsert ledger batch: ${error.message}`);
    console.log(`[LEDGER] Upserted batch ${Math.floor(i / 100) + 1} (${batch.length} records)`);
  }

  return bcLedger.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = new Date();
  console.log(`\n========================================`);
  console.log(`BC Sync Agent — ${startTime.toISOString()}`);
  if (DRY_RUN) console.log("[DRY-RUN MODE — no data will be written]");
  console.log(`BC URL: ${BC_URL}`);
  console.log(`Company GUID: ${BC_COMPANY_GUID}`);
  console.log(`Organization: ${ORGANIZATION_ID}`);
  console.log(`========================================\n`);

  // Get BC config from Supabase
  const config = await getBCConfig();
  if (!config) {
    console.error("[ERROR] No bc_config found in Supabase for this organization.");
    console.error("  Please configure the integration in CCA Legal Hub Settings first.");
    process.exit(1);
  }

  const configId = config.id;

  // Create sync log entry
  let syncLogId = null;
  if (!DRY_RUN) {
    const { data: logEntry } = await supabase
      .from("bc_sync_logs")
      .insert({
        config_id: configId,
        organization_id: ORGANIZATION_ID,
        status: "running",
        started_at: startTime.toISOString(),
      })
      .select("id")
      .single();

    syncLogId = logEntry?.id;

    // Mark config as syncing
    await supabase
      .from("bc_config")
      .update({ last_sync_status: "running", updated_at: new Date().toISOString() })
      .eq("id", configId);
  }

  let customersCount = 0;
  let accountsCount = 0;
  let ledgerCount = 0;
  let errorMessage = null;

  try {
    customersCount = await syncCustomers(configId);
    accountsCount = await syncAccounts(configId);
    ledgerCount = await syncLedger(configId);

    const duration = ((new Date() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================`);
    console.log(`Sync completed in ${duration}s`);
    console.log(`  Customers: ${customersCount}`);
    console.log(`  Accounts:  ${accountsCount}`);
    console.log(`  Ledger:    ${ledgerCount}`);
    console.log(`========================================\n`);

  } catch (err) {
    errorMessage = err.message;
    console.error(`\n[ERROR] Sync failed: ${errorMessage}`);
  }

  // Update sync log + config status
  if (!DRY_RUN) {
    const completedAt = new Date().toISOString();
    const status = errorMessage ? "error" : "success";

    if (syncLogId) {
      await supabase
        .from("bc_sync_logs")
        .update({
          completed_at: completedAt,
          status,
          customers_synced: customersCount,
          accounts_synced: accountsCount,
          ledger_entries_synced: ledgerCount,
          error_message: errorMessage,
        })
        .eq("id", syncLogId);
    }

    await supabase
      .from("bc_config")
      .update({
        last_sync_at: completedAt,
        last_sync_status: status,
        last_sync_error: errorMessage,
        updated_at: completedAt,
      })
      .eq("id", configId);
  }

  if (errorMessage) process.exit(1);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
