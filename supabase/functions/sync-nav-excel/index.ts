import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normaliza nomes de coluna removendo acentos, espaços e maiúsculas
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Tenta vários nomes possíveis para uma coluna
function findValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeKey(k), v])
  );
  for (const candidate of candidates) {
    const val = normalized[normalizeKey(candidate)];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

// Converte número serial do Excel para data ISO
function excelSerialToDate(serial: number): string | null {
  if (!serial || isNaN(serial)) return null;
  // Excel usa 1900-01-01 como dia 1 (com bug do ano bissexto de 1900)
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

// Resolve data de vários formatos possíveis
function resolveDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "number") return excelSerialToDate(raw);
  if (typeof raw === "string") {
    // Formato PT: dd/mm/yyyy
    const ptMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ptMatch) return `${ptMatch[3]}-${ptMatch[2].padStart(2, "0")}-${ptMatch[1].padStart(2, "0")}`;
    // ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validar autenticação - apenas platform admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se é platform admin
    const { data: adminRecord } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      return new Response(JSON.stringify({ error: "Forbidden: platform admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ler o ficheiro do FormData
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Empty spreadsheet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapear linhas para registos do cache
    const records: Array<{
      jvris_id: string;
      valor_pendente: number | null;
      data_vencimento: string | null;
      raw_row: Record<string, unknown>;
      synced_at: string;
    }> = [];

    for (const row of rows) {
      const rawId = findValue(row, [
        "jvris_id", "id_jvris", "id", "cliente_id", "codigo_cliente",
        "cod_cliente", "numero_cliente", "client_id",
      ]);

      if (!rawId) continue;
      const jvrisId = String(rawId).trim();
      if (!jvrisId) continue;

      const rawValor = findValue(row, [
        "valor_pendente", "valor pendente", "saldo_pendente", "saldo pendente",
        "total_pendente", "total pendente", "divida", "dívida", "amount",
      ]);
      const valorPendente =
        rawValor !== null && rawValor !== undefined
          ? parseFloat(String(rawValor).replace(",", "."))
          : null;

      const rawData = findValue(row, [
        "data_vencimento", "data vencimento", "vencimento", "due_date",
        "data_limite", "prazo", "expiry_date",
      ]);
      const dataVencimento = resolveDate(rawData);

      records.push({
        jvris_id: jvrisId,
        valor_pendente: isNaN(valorPendente as number) ? null : valorPendente,
        data_vencimento: dataVencimento,
        raw_row: row as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      });
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid rows found. Check column names (jvris_id required)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert em lote
    const { error: upsertError } = await supabaseAdmin
      .from("financeiro_nav_cache")
      .upsert(records, { onConflict: "jvris_id" });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, synced: records.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-nav-excel error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
