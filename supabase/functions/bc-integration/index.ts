import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callPAFlow } from "../_shared/bcClient.ts";
import { handleCors, validateAuth, jsonResponse, errorResponse } from "../_shared/auth.ts";
import {
  BCRequest,
  BCCustomer,
  BCLedgerEntry,
  BCDashboardStats,
  PAFlowRequest,
} from "../_shared/types.ts";

// TTL de cache em segundos por tipo de acção
const CACHE_TTL: Record<string, number> = {
  getCustomers: 300,       // 5 min
  getCustomerById: 300,
  getLedgerEntries: 120,   // 2 min
  getOverdueEntries: 120,
  getDashboard: 180,       // 3 min
};

const COMPANY_ID = Deno.env.get("BC_COMPANY_ID") ?? "";

/** Gera uma chave de cache determinística. */
function cacheKey(action: string, params: Record<string, unknown>): string {
  const stable = JSON.stringify(params, Object.keys(params).sort());
  return `bc:${action}:${btoa(stable)}`;
}

/** Lê do cache Supabase. Devolve null se não existe ou expirou. */
async function readCache(supabaseAdmin: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.39.3")["createClient"]>, key: string) {
  const { data, error } = await supabaseAdmin
    .from("bc_cache")
    .select("payload, created_at, expires_at")
    .eq("cache_key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const ageSeconds = Math.floor(
    (Date.now() - new Date(data.created_at).getTime()) / 1000
  );

  return { payload: data.payload, ageSeconds };
}

/** Escreve no cache Supabase (upsert). */
async function writeCache(
  supabaseAdmin: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.39.3")["createClient"]>,
  key: string,
  payload: unknown,
  ttlSeconds: number
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await supabaseAdmin.from("bc_cache").upsert(
    { cache_key: key, payload, expires_at: expiresAt },
    { onConflict: "cache_key" }
  );
}

// ---------------------------------------------------------------------------

serve(async (req) => {
  // Preflight CORS
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // Autenticação JWT
    const { supabaseAdmin } = await validateAuth(req);

    // Parsed body
    const body: BCRequest = await req.json();
    const { action, customerNo, filter, top, skip, bypassCache = false } = body;

    if (!action) {
      return errorResponse("Campo 'action' é obrigatório", 400);
    }

    if (!COMPANY_ID) {
      return errorResponse("BC_COMPANY_ID secret não está configurado", 500);
    }

    const ttl = CACHE_TTL[action] ?? 180;
    const key = cacheKey(action, { action, customerNo, filter, top, skip });

    // ── Verificar cache ──────────────────────────────────────────────────────
    if (!bypassCache) {
      const cached = await readCache(supabaseAdmin, key);
      if (cached) {
        console.log(`[bc-integration] CACHE HIT key=${key} age=${cached.ageSeconds}s`);
        return jsonResponse({
          success: true,
          data: cached.payload,
          cached: true,
          cacheAge: cached.ageSeconds,
        });
      }
    }

    // ── Construir payload para o Power Automate ──────────────────────────────
    const paPayload: PAFlowRequest = {
      action: "getCustomers", // será sobreposto abaixo
      companyId: COMPANY_ID,
      customerNo,
      filter,
      top,
      skip,
    };

    let result: unknown;

    // ── Routing por acção ────────────────────────────────────────────────────
    switch (action) {
      case "getCustomers": {
        paPayload.action = "getCustomers";
        const flowResp = await callPAFlow<BCCustomer>(paPayload);
        result = flowResp.data;
        break;
      }

      case "getCustomerById": {
        if (!customerNo) {
          return errorResponse("'customerNo' é obrigatório para getCustomerById", 400);
        }
        paPayload.action = "getCustomerById";
        paPayload.customerNo = customerNo;
        const flowResp = await callPAFlow<BCCustomer>(paPayload);
        result = flowResp.data[0] ?? null;
        break;
      }

      case "getLedgerEntries": {
        paPayload.action = "getLedgerEntries";
        const flowResp = await callPAFlow<BCLedgerEntry>(paPayload);
        result = flowResp.data;
        break;
      }

      case "getOverdueEntries": {
        paPayload.action = "getLedgerEntries";
        paPayload.filter = "open eq true and dueDate lt " + new Date().toISOString().split("T")[0];
        const flowResp = await callPAFlow<BCLedgerEntry>(paPayload);
        result = flowResp.data;
        break;
      }

      case "getDashboard": {
        // Busca em paralelo clientes e entradas abertas
        const [custResp, ledgerResp] = await Promise.all([
          callPAFlow<BCCustomer>({ ...paPayload, action: "getCustomers" }),
          callPAFlow<BCLedgerEntry>({
            ...paPayload,
            action: "getLedgerEntries",
            filter: "open eq true",
          }),
        ]);

        const customers = custResp.data;
        const ledger = ledgerResp.data;

        const today = new Date().toISOString().split("T")[0];
        const overdueEntries = ledger.filter(
          (e) => e.open && e.dueDate && e.dueDate < today
        );

        const stats: BCDashboardStats = {
          totalCustomers: customers.length,
          customersWithDebt: new Set(
            ledger.filter((e) => e.open && e.remainingAmount > 0).map((e) => e.customerNo)
          ).size,
          totalDebt: ledger
            .filter((e) => e.open)
            .reduce((s, e) => s + e.remainingAmount, 0),
          totalOverdue: overdueEntries.reduce((s, e) => s + e.remainingAmount, 0),
          overdueEntries: overdueEntries.length,
        };

        result = stats;
        break;
      }

      default:
        return errorResponse(`Acção desconhecida: ${action}`, 400);
    }

    // ── Escrever no cache ────────────────────────────────────────────────────
    await writeCache(supabaseAdmin, key, result, ttl);

    console.log(`[bc-integration] OK action=${action}`);
    return jsonResponse({ success: true, data: result, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bc-integration] ERROR: ${message}`);

    if (message.includes("Unauthorized")) {
      return errorResponse(message, 401);
    }
    return errorResponse(message, 500);
  }
});
