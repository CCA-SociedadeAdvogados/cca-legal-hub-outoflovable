import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Utility: column name normalization ──────────────────────────

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

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

function excelSerialToDate(serial: number): string | null {
  if (!serial || isNaN(serial)) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

function resolveDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "number") return excelSerialToDate(raw);
  if (typeof raw === "string") {
    const ptMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ptMatch) return `${ptMatch[3]}-${ptMatch[2].padStart(2, "0")}-${ptMatch[1].padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  }
  return null;
}

/** Returns true if the value looks like a Portuguese invoice/document number */
function looksLikeDocumentNumber(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  // Portuguese document prefixes: FT (fatura), ND (nota débito), NC (nota crédito),
  // FR (fatura-recibo), RE (recibo), VD (venda a dinheiro), GT (guia transporte),
  // RC (recibo), FP (fatura proforma)
  return /^(FT|ND|NC|FR|RE|VD|GT|RC|FP)\d+/.test(trimmed);
}

// ── Microsoft Graph API helpers ─────────────────────────────────

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getDriveId(accessToken: string, siteId: string): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drive: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

// List all drives (document libraries) for a SharePoint site
async function listAllDrives(accessToken: string, siteId: string): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    console.error("Failed to list drives:", await response.text());
    return [];
  }

  const data = await response.json();
  return (data.value || []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }));
}

// Search for "Base Nav" Excel file in a specific drive, returns null if not found
async function searchBaseNavInDrive(
  accessToken: string,
  driveId: string,
): Promise<{ id: string; name: string } | null> {
  // Try search API first
  const searchUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/search(q='Base Nav')`;
  console.log(`Searching for Base Nav file in drive ${driveId}: ${searchUrl}`);

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let items: Array<{ id: string; name: string; file?: { mimeType: string }; lastModifiedDateTime?: string }> = [];

  if (response.ok) {
    const data = await response.json();
    items = data.value || [];
  } else {
    console.warn(`Search API failed for drive ${driveId}, trying children listing...`);
    // Fallback: list root children directly
    const childrenUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
    const childrenResp = await fetch(childrenUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (childrenResp.ok) {
      const childrenData = await childrenResp.json();
      items = childrenData.value || [];
    }
  }

  // Filter to Excel files whose name contains "Base Nav" (case-insensitive)
  const excelFiles = items.filter((item) => {
    if (!item.file) return false;
    const nameLower = item.name.toLowerCase();
    if (!nameLower.includes("base nav")) return false;
    return nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls") || nameLower.endsWith(".csv");
  });

  if (excelFiles.length === 0) return null;

  // If multiple matches, pick the most recently modified
  excelFiles.sort((a, b) => {
    const dateA = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
    const dateB = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
    return dateB - dateA;
  });

  const chosen = excelFiles[0];
  console.log(`Found Base Nav file: id=${chosen.id}, name=${chosen.name}`);
  return { id: chosen.id, name: chosen.name };
}

// Search for the "Base Nav" Excel file across all drives of the site
async function findBaseNavFile(
  accessToken: string,
  siteId: string,
  primaryDriveId: string,
): Promise<{ driveId: string; id: string; name: string }> {
  // 1. Try the primary (configured) drive first
  console.log(`Searching primary drive: ${primaryDriveId}`);
  const result = await searchBaseNavInDrive(accessToken, primaryDriveId);
  if (result) return { driveId: primaryDriveId, ...result };

  // 2. If not found, try all other drives of the site
  console.log("Base Nav not found in primary drive, searching all drives...");
  const allDrives = await listAllDrives(accessToken, siteId);
  console.log(`Found ${allDrives.length} drives: ${allDrives.map(d => d.name).join(", ")}`);

  for (const drive of allDrives) {
    if (drive.id === primaryDriveId) continue; // skip already searched
    console.log(`Searching drive "${drive.name}" (${drive.id})...`);
    const found = await searchBaseNavInDrive(accessToken, drive.id);
    if (found) return { driveId: drive.id, ...found };
  }

  throw new Error(
    'Ficheiro "Base Nav" não encontrado em nenhuma biblioteca do SharePoint. ' +
    'Verifique que existe um ficheiro Excel com "Base Nav" no nome.'
  );
}

// Download a file's content from SharePoint
async function downloadFileContent(accessToken: string, driveId: string, fileId: string): Promise<ArrayBuffer> {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`;
  console.log(`Downloading file content: ${url}`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Download error:", error);
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return response.arrayBuffer();
}

// ── Main handler ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authentication
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify platform admin
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

    // Read JSON body with organization_id
    const body = await req.json();
    const { organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get SharePoint config for this organization
    const { data: spConfig, error: spError } = await supabaseAdmin
      .from("sharepoint_config")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (spError) throw spError;
    if (!spConfig) {
      return new Response(
        JSON.stringify({ error: "SharePoint não configurado para esta organização." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SharePoint credentials
    const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
    const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
    const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Credenciais SharePoint não configuradas no servidor.");
    }

    // Authenticate with Microsoft Graph
    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

    // Resolve primary drive ID
    let primaryDriveId = spConfig.drive_id;
    if (!primaryDriveId) {
      primaryDriveId = await getDriveId(accessToken, spConfig.site_id);
    }

    // Find the "Base Nav" Excel file across all drives
    const baseNavFile = await findBaseNavFile(accessToken, spConfig.site_id, primaryDriveId);

    // Download the file content (using the drive where the file was found)
    const arrayBuffer = await downloadFileContent(accessToken, baseNavFile.driveId, baseNavFile.id);

    // Parse the Excel file
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Folha de cálculo vazia." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Column candidate lists ──────────────────────────────────
    const ID_CANDIDATES = [
      "jvris_id", "id_jvris", "id", "cliente_id", "codigo_cliente",
      "cod_cliente", "numero_cliente", "client_id",
    ];
    const VALOR_CANDIDATES = [
      "valor_pendente", "valor pendente", "saldo_pendente", "saldo pendente",
      "total_pendente", "total pendente", "divida", "dívida", "amount",
      "soma_de_valor_pendente", "soma de valor pendente", "soma valor pendente",
      "valor", "montante",
    ];
    const DATE_CANDIDATES = [
      "data_vencimento", "data vencimento", "vencimento", "due_date",
      "data_limite", "prazo", "expiry_date",
      "data_de_vencimento", "data de vencimento",
    ];
    const NUMERO_CANDIDATES = [
      "numero_documento", "numero documento", "nº doc", "nº documento",
      "numero_fatura", "numero fatura", "nº fatura",
      "documento", "fatura", "invoice_number", "doc_number",
      "referencia", "reference", "numero", "nº",
    ];

    // ── Group rows into parent (Client ID) + children (invoices) ─
    type ClientGroup = {
      parentRow: Record<string, unknown>;
      valorPendente: number | null;
      children: Array<{
        row: Record<string, unknown>;
        numero: string | null;
        valor: number | null;
        dataVencimento: string | null;
      }>;
    };

    const groups = new Map<string, ClientGroup>();
    let currentJvrisId: string | null = null;

    for (const row of rows) {
      const rawId = findValue(row, ID_CANDIDATES);
      const rawIdStr = rawId ? String(rawId).trim() : "";

      if (rawId && rawIdStr && !looksLikeDocumentNumber(rawIdStr)) {
        // ── Parent row: has a Client ID (not an invoice number) ──
        currentJvrisId = rawIdStr;

        const rawValor = findValue(row, VALOR_CANDIDATES);
        const vp = rawValor != null
          ? parseFloat(String(rawValor).replace(",", "."))
          : null;

        const group: ClientGroup = {
          parentRow: row as Record<string, unknown>,
          valorPendente: (vp !== null && !isNaN(vp)) ? vp : null,
          children: [],
        };

        // If the parent row also has invoice data (flat structure),
        // create a child item from the same row
        const parentNumero = findValue(row, NUMERO_CANDIDATES);
        const parentData   = findValue(row, DATE_CANDIDATES);
        if (parentNumero) {
          const pNumero = String(parentNumero).trim();
          const pValor  = (vp !== null && !isNaN(vp)) ? vp : null;
          const pData   = resolveDate(parentData);
          if (pNumero || pData || pValor !== null) {
            group.children.push({
              row: row as Record<string, unknown>,
              numero: pNumero || null,
              valor: pValor,
              dataVencimento: pData,
            });
          }
        }

        groups.set(rawIdStr, group);
      } else if (rawId && rawIdStr && looksLikeDocumentNumber(rawIdStr) && currentJvrisId && groups.has(currentJvrisId)) {
        // ── Child row: value in ID column is actually an invoice number ──
        const rawNumero = findValue(row, NUMERO_CANDIDATES);
        const rawValor  = findValue(row, VALOR_CANDIDATES);
        const rawData   = findValue(row, DATE_CANDIDATES);

        // Use NUMERO_CANDIDATES column if available; otherwise the ID column value is the invoice number
        const numero = rawNumero ? String(rawNumero).trim() : rawIdStr;
        const valor  = rawValor != null
          ? parseFloat(String(rawValor).replace(",", "."))
          : null;
        const dataVencimento = resolveDate(rawData);

        if (numero || dataVencimento || (valor !== null && !isNaN(valor))) {
          groups.get(currentJvrisId)!.children.push({
            row: row as Record<string, unknown>,
            numero,
            valor: (valor !== null && !isNaN(valor)) ? valor : null,
            dataVencimento,
          });
        }
      } else if (currentJvrisId && groups.has(currentJvrisId)) {
        // ── Child row: no Client ID → invoice line of current parent ──
        const rawNumero = findValue(row, NUMERO_CANDIDATES);
        const rawValor = findValue(row, VALOR_CANDIDATES);
        const rawData  = findValue(row, DATE_CANDIDATES);

        const numero = rawNumero ? String(rawNumero).trim() : null;
        const valor  = rawValor != null
          ? parseFloat(String(rawValor).replace(",", "."))
          : null;
        const dataVencimento = resolveDate(rawData);

        // Only keep rows with meaningful data
        if (numero || dataVencimento || (valor !== null && !isNaN(valor))) {
          groups.get(currentJvrisId)!.children.push({
            row: row as Record<string, unknown>,
            numero,
            valor: (valor !== null && !isNaN(valor)) ? valor : null,
            dataVencimento,
          });
        }
      }
    }

    // Debug logging for parsed groups
    console.log(`Parsed ${groups.size} client groups from ${rows.length} rows:`);
    for (const [jvrisId, group] of groups) {
      console.log(`  ${jvrisId}: valor_pendente=${group.valorPendente}, children=${group.children.length}`);
    }

    if (groups.size === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma linha válida encontrada. Verifique os nomes das colunas (Client ID obrigatório)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build cache + item records ───────────────────────────────
    const now = new Date().toISOString();
    const cacheRecords: Array<{
      jvris_id: string;
      valor_pendente: number | null;
      data_vencimento: string | null;
      raw_row: Record<string, unknown>;
      synced_at: string;
    }> = [];
    const itemRecords: Array<{
      jvris_id: string;
      numero_documento: string | null;
      valor: number | null;
      data_vencimento: string | null;
      raw_row: Record<string, unknown>;
      synced_at: string;
    }> = [];

    for (const [jvrisId, group] of groups) {
      // Oldest due date across child invoices (worst case for status)
      let oldestDate: string | null = null;
      for (const child of group.children) {
        if (child.dataVencimento) {
          if (!oldestDate || child.dataVencimento < oldestDate) {
            oldestDate = child.dataVencimento;
          }
        }
      }

      cacheRecords.push({
        jvris_id: jvrisId,
        valor_pendente: group.valorPendente,
        data_vencimento: oldestDate,
        raw_row: group.parentRow,
        synced_at: now,
      });

      for (const child of group.children) {
        itemRecords.push({
          jvris_id: jvrisId,
          numero_documento: child.numero,
          valor: child.valor,
          data_vencimento: child.dataVencimento,
          raw_row: child.row,
          synced_at: now,
        });
      }
    }

    // ── Persist to database ──────────────────────────────────────
    // 1. Upsert parent cache records
    const { error: upsertError } = await supabaseAdmin
      .from("financeiro_nav_cache")
      .upsert(cacheRecords, { onConflict: "jvris_id" });
    if (upsertError) throw upsertError;

    // 2. Replace child items: delete old → insert new
    const syncedIds = cacheRecords.map((r) => r.jvris_id);
    const { error: deleteError } = await supabaseAdmin
      .from("financeiro_nav_items")
      .delete()
      .in("jvris_id", syncedIds);
    if (deleteError) throw deleteError;

    if (itemRecords.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("financeiro_nav_items")
        .insert(itemRecords);
      if (insertError) throw insertError;
    }

    const totalItems = itemRecords.length;
    console.log(`Synced ${cacheRecords.length} clients, ${totalItems} invoice items from ${baseNavFile.name}`);

    // ── Auto-link: set org.jvris_id if not already configured ──
    // Only auto-link when there is exactly 1 client in the Excel (unambiguous).
    // For multi-client files, the admin must set jvris_id manually.
    let autoLinkedJvrisId: string | null = null;
    let orgJvrisId: unknown = null;
    if (cacheRecords.length > 0) {
      const { data: orgRecord } = await supabaseAdmin
        .from("organizations")
        .select("jvris_id")
        .eq("id", organization_id)
        .single();

      orgJvrisId = (orgRecord as Record<string, unknown>)?.jvris_id;
      if (!orgJvrisId && cacheRecords.length === 1) {
        autoLinkedJvrisId = cacheRecords[0].jvris_id;
        await supabaseAdmin
          .from("organizations")
          .update({ jvris_id: autoLinkedJvrisId })
          .eq("id", organization_id);
        console.log(`Auto-linked org ${organization_id} → jvris_id ${autoLinkedJvrisId}`);
      } else if (!orgJvrisId && cacheRecords.length > 1) {
        console.log(`Org ${organization_id} has no jvris_id set. ${cacheRecords.length} clients found — manual configuration required.`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: cacheRecords.length,
        items: totalItems,
        file: baseNavFile.name,
        jvris_ids: cacheRecords.map((r) => r.jvris_id),
        auto_linked: autoLinkedJvrisId,
        needs_jvris_config: !orgJvrisId && cacheRecords.length > 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-nav-excel error:", JSON.stringify(err));
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
