/**
 * BC Sync — customers → Supabase
 *
 * Corre na rede interna da empresa. Chama a API do Business Central,
 * faz upsert dos clientes em bc_customers no Supabase, e termina.
 *
 * Uso:
 *   node sync.js
 *
 * Agendamento (Windows Task Scheduler):
 *   schtasks /create /sc hourly /tn "BC Sync" /tr "node C:\bc-sync\sync.js" /st 00:00
 *
 * Agendamento (Linux cron — a cada hora):
 *   0 * * * * cd /caminho/bc-sync && node sync.js >> /var/log/bc-sync.log 2>&1
 *
 * Agendamento (PM2):
 *   pm2 start sync.js --name bc-sync --cron "0 * * * *"
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// ── Variáveis obrigatórias ────────────────────────────────────────────────────
const REQUIRED = [
  "BC_USERNAME",
  "BC_PASSWORD",
  "BC_BASE_URL",
  "BC_COMPANY_GUID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ORGANIZATION_ID",
];
for (const v of REQUIRED) {
  if (!process.env[v]) {
    console.error(`[ERRO] Variável em falta: ${v}`);
    process.exit(1);
  }
}

const {
  BC_USERNAME,
  BC_PASSWORD,
  BC_BASE_URL,
  BC_COMPANY_GUID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ORGANIZATION_ID,
} = process.env;

const BC_CUSTOMERS_URL = `${BC_BASE_URL}/api/arq/payme/v1.0/companies(${BC_COMPANY_GUID})/customers`;
const AUTH_HEADER = "Basic " + Buffer.from(`${BC_USERNAME}:${BC_PASSWORD}`).toString("base64");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[${new Date().toISOString()}] A iniciar sync...`);

  // 1. Fetch — trata paginação OData (@odata.nextLink)
  let url = BC_CUSTOMERS_URL;
  const customers = [];

  while (url) {
    console.log(`  GET ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: AUTH_HEADER, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    customers.push(...(data.value || []));
    url = data["@odata.nextLink"] || null;
  }

  console.log(`  ${customers.length} clientes recebidos do BC`);

  // 2. Mapeamento BC → tabela
  const records = customers.map((c) => ({
    organization_id:    ORGANIZATION_ID,
    bc_id:              c.id,
    bc_number:          c.number                 || null,
    display_name:       c.displayName            || "",
    nif:                c.taxRegistrationNumber  || null,
    address:            c.addressLine1           || null,
    city:               c.city                   || null,
    country:            c.country                || null,
    post_code:          c.postalCode             || null,
    phone:              c.phoneNumber            || null,
    email:              c.email                  || null,
    balance:            c.balance                ?? null,
    credit_limit:       c.creditLimitLCY         ?? null,
    payment_terms_code: c.paymentTermsCode       || null,
    currency_code:      c.currencyCode           || "EUR",
    bc_last_modified:   c.lastModifiedDateTime   || null,
    synced_at:          new Date().toISOString(),
  }));

  // 3. Upsert em batches de 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase
      .from("bc_customers")
      .upsert(batch, { onConflict: "organization_id,bc_id" });
    if (error) throw new Error(`Upsert falhou: ${error.message}`);
    console.log(`  Upserted ${i + batch.length}/${records.length}`);
  }

  console.log(`[${new Date().toISOString()}] Sync concluído.`);
}

main().catch((err) => {
  console.error(`[ERRO] ${err.message}`);
  process.exit(1);
});
