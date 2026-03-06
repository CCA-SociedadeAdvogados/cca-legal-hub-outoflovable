import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// xlsx utilizado para ler o ficheiro SharePoint com o mapeamento email → ID Jvris
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SSO CCA Configuration (to be set via secrets)
const SSO_CONFIG = {
  clientId: Deno.env.get("CCA_SSO_CLIENT_ID") || "",
  clientSecret: Deno.env.get("CCA_SSO_CLIENT_SECRET") || "",
  // Trim trailing slash to prevent double-slash in endpoint URLs (e.g. //authorize, //token)
  issuerUrl: (Deno.env.get("CCA_SSO_ISSUER_URL") || "").replace(/\/$/, ""),
  redirectUrl: (Deno.env.get("CCA_SSO_REDIRECT_URL") || "").trim(),
  allowedDomains: (Deno.env.get("CCA_SSO_ALLOWED_DOMAINS") || "cca.pt,cca-law.com,cca.law").split(",").map(d => d.trim().toLowerCase()),
  defaultRole: "viewer",
};

// Input validation constants
const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 128;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Configuração Jvris / SharePoint ────────────────────────────────────────
// As credenciais SharePoint (SHAREPOINT_*) já estão configuradas para o sync-nav-excel.
// CCA_JVRIS_USERS_FILE: nome (sem extensão) do ficheiro Excel no SharePoint que
//   contém a listagem de utilizadores CCA com os respetivos IDs Jvris.
//   Formato esperado: colunas "email" e "jvris_id" (nomes flexíveis, ver abaixo).
// CCA_JVRIS_SHAREPOINT_SITE_ID: ID do site SharePoint da CCA onde o ficheiro reside.
//   Se não definido, o lookup é ignorado (login não é bloqueado).
const JVRIS_CONFIG = {
  tenantId: Deno.env.get("SHAREPOINT_TENANT_ID") || "",
  clientId: Deno.env.get("SHAREPOINT_CLIENT_ID") || "",
  clientSecret: Deno.env.get("SHAREPOINT_CLIENT_SECRET") || "",
  siteId: Deno.env.get("CCA_JVRIS_SHAREPOINT_SITE_ID") || "",
  fileName: Deno.env.get("CCA_JVRIS_USERS_FILE") || "Jvris_Utilizadores",
};

// Candidatos para o cabeçalho da coluna de email (case-insensitive, sem diacríticos)
const EMAIL_COL_CANDIDATES = ["email", "emailaddress", "correioeletronico", "utilizadoremail", "upn", "mail"];
// Candidatos para o cabeçalho da coluna do ID Jvris
const JVRIS_COL_CANDIDATES = ["jvrisid", "idjvris", "jvris", "codigojvris", "codigo", "clienteid"];

/** Normaliza um cabeçalho de coluna: lowercase + remove diacríticos + remove não-alfanumérico */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Obtém um token de acesso à Microsoft Graph API usando as credenciais
 * de aplicação SharePoint (client credentials flow).
 */
async function getGraphToken(): Promise<string | null> {
  if (!JVRIS_CONFIG.tenantId || !JVRIS_CONFIG.clientId || !JVRIS_CONFIG.clientSecret) {
    console.log("[SSO-CCA][Jvris] Credenciais SharePoint não configuradas — lookup ignorado");
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${JVRIS_CONFIG.tenantId}/oauth2/v2.0/token`;
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: JVRIS_CONFIG.clientId,
        client_secret: JVRIS_CONFIG.clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    });

    if (!resp.ok) {
      console.error(`[SSO-CCA][Jvris] Falha ao obter token Graph: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    return data.access_token as string ?? null;
  } catch (err) {
    console.error("[SSO-CCA][Jvris] Erro ao obter token Graph:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Procura o ficheiro de mapeamento Jvris nos drives do site SharePoint configurado.
 * Devolve a URL de download ou null se não encontrado.
 */
async function findJvrisFileDownloadUrl(graphToken: string): Promise<string | null> {
  if (!JVRIS_CONFIG.siteId) {
    console.log("[SSO-CCA][Jvris] CCA_JVRIS_SHAREPOINT_SITE_ID não configurado — lookup ignorado");
    return null;
  }

  try {
    // Listar todos os drives (bibliotecas de documentos) do site
    const drivesResp = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${JVRIS_CONFIG.siteId}/drives`,
      { headers: { "Authorization": `Bearer ${graphToken}` } }
    );

    if (!drivesResp.ok) {
      console.error(`[SSO-CCA][Jvris] Falha ao listar drives: ${drivesResp.status}`);
      return null;
    }

    const drivesData = await drivesResp.json();
    const drives: Array<{ id: string; name: string }> = drivesData.value || [];
    console.log(`[SSO-CCA][Jvris] ${drives.length} drive(s) encontrado(s) no site CCA`);

    const fileNameLower = JVRIS_CONFIG.fileName.toLowerCase();

    for (const drive of drives) {
      // Pesquisar o ficheiro dentro do drive atual
      const searchResp = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/search(q='${encodeURIComponent(JVRIS_CONFIG.fileName)}')`,
        { headers: { "Authorization": `Bearer ${graphToken}` } }
      );

      if (!searchResp.ok) continue;

      const searchData = await searchResp.json();
      const items: Array<{ name: string; "@microsoft.graph.downloadUrl"?: string; file?: object }> =
        searchData.value || [];

      // Encontrar o ficheiro cujo nome (sem extensão) corresponda ao configurado
      const match = items.find((item) => {
        if (!item.file) return false; // ignorar pastas
        const nameWithoutExt = item.name.replace(/\.[^.]+$/, "").toLowerCase();
        return nameWithoutExt === fileNameLower;
      });

      if (match && match["@microsoft.graph.downloadUrl"]) {
        console.log(`[SSO-CCA][Jvris] Ficheiro encontrado: "${match.name}" no drive "${drive.name}"`);
        return match["@microsoft.graph.downloadUrl"];
      }
    }

    console.log(`[SSO-CCA][Jvris] Ficheiro "${JVRIS_CONFIG.fileName}" não encontrado nos ${drives.length} drive(s)`);
    return null;
  } catch (err) {
    console.error("[SSO-CCA][Jvris] Erro ao procurar ficheiro:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Lê o ficheiro Excel do SharePoint com o mapeamento organização → ID Jvris e
 * atualiza a coluna `organizations.jvris_id` para cada organização encontrada.
 *
 * Formato esperado do ficheiro (colunas flexíveis):
 *   nome_org  |  jvris_id
 *   ----------|----------
 *   Client A  |  C.0009
 *   Client B  |  C.0042
 *
 * A correspondência é feita pelo nome da organização (case-insensitive, normalizado).
 * Organizações sem correspondência ficam inalteradas.
 * Função completamente não-bloqueante — erros apenas registados em log.
 *
 * Env var adicional: CCA_JVRIS_ORGS_FILE (default: "Jvris_Clientes")
 */
// deno-lint-ignore no-explicit-any
async function syncOrgsJvrisIdFromSharePoint(supabase: any): Promise<void> {
  try {
    const orgsFileName = Deno.env.get("CCA_JVRIS_ORGS_FILE") || "Jvris_Clientes";

    // Passo 1: obter token Graph
    const graphToken = await getGraphToken();
    if (!graphToken) return;

    // Passo 2: localizar o ficheiro no SharePoint (reutiliza a lógica de findJvrisFileDownloadUrl
    //          com o nome do ficheiro de organizações)
    if (!JVRIS_CONFIG.siteId) {
      console.log("[SSO-CCA][Jvris][Orgs] CCA_JVRIS_SHAREPOINT_SITE_ID não configurado — sync ignorado");
      return;
    }

    const drivesResp = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${JVRIS_CONFIG.siteId}/drives`,
      { headers: { "Authorization": `Bearer ${graphToken}` } }
    );

    if (!drivesResp.ok) {
      console.error(`[SSO-CCA][Jvris][Orgs] Falha ao listar drives: ${drivesResp.status}`);
      return;
    }

    const drivesData = await drivesResp.json();
    const drives: Array<{ id: string; name: string }> = drivesData.value || [];
    const orgsFileNameLower = orgsFileName.toLowerCase();
    let downloadUrl: string | null = null;

    for (const drive of drives) {
      const searchResp = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/search(q='${encodeURIComponent(orgsFileName)}')`,
        { headers: { "Authorization": `Bearer ${graphToken}` } }
      );
      if (!searchResp.ok) continue;

      const searchData = await searchResp.json();
      const items: Array<{ name: string; "@microsoft.graph.downloadUrl"?: string; file?: object }> =
        searchData.value || [];

      const match = items.find((item) => {
        if (!item.file) return false;
        const nameWithoutExt = item.name.replace(/\.[^.]+$/, "").toLowerCase();
        return nameWithoutExt === orgsFileNameLower;
      });

      if (match && match["@microsoft.graph.downloadUrl"]) {
        console.log(`[SSO-CCA][Jvris][Orgs] Ficheiro encontrado: "${match.name}" no drive "${drive.name}"`);
        downloadUrl = match["@microsoft.graph.downloadUrl"];
        break;
      }
    }

    if (!downloadUrl) {
      console.log(`[SSO-CCA][Jvris][Orgs] Ficheiro "${orgsFileName}" não encontrado — sync de orgs ignorado`);
      return;
    }

    // Passo 3: descarregar e parsear o ficheiro
    const fileResp = await fetch(downloadUrl);
    if (!fileResp.ok) {
      console.error(`[SSO-CCA][Jvris][Orgs] Falha ao descarregar ficheiro: ${fileResp.status}`);
      return;
    }

    const fileBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return;

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[firstSheetName],
      { defval: "" }
    );

    if (rows.length === 0) {
      console.log("[SSO-CCA][Jvris][Orgs] Ficheiro vazio");
      return;
    }

    // Passo 4: identificar colunas de nome da org e jvris_id
    const headers = Object.keys(rows[0]);
    const ORG_NAME_CANDIDATES = ["nome", "nomeorg", "organizacao", "nome_organizacao", "organization", "name", "client", "cliente"];
    let orgNameCol: string | null = null;
    let orgJvrisCol: string | null = null;

    for (const h of headers) {
      const normalized = normalizeHeader(h);
      if (!orgNameCol && ORG_NAME_CANDIDATES.includes(normalized)) orgNameCol = h;
      if (!orgJvrisCol && JVRIS_COL_CANDIDATES.includes(normalized)) orgJvrisCol = h;
    }

    if (!orgNameCol || !orgJvrisCol) {
      console.log(
        `[SSO-CCA][Jvris][Orgs] Colunas não identificadas no ficheiro de organizações. ` +
        `Cabeçalhos: [${headers.join(", ")}]`
      );
      return;
    }

    console.log(`[SSO-CCA][Jvris][Orgs] ${rows.length} linhas — col org: "${orgNameCol}", col jvris: "${orgJvrisCol}"`);

    // Passo 5: buscar todas as organizações do Supabase
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, jvris_id");

    if (orgsError) {
      console.error(`[SSO-CCA][Jvris][Orgs] Erro ao buscar organizações:`, orgsError.message);
      return;
    }

    // Passo 6: fazer o match e atualizar jvris_id para cada organização encontrada
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const rowOrgName = String(row[orgNameCol] || "").trim();
      const rowJvrisId = String(row[orgJvrisCol] || "").trim();

      if (!rowOrgName || !rowJvrisId) continue;

      // Encontrar organização pelo nome (case-insensitive)
      const org = (orgs || []).find(
        (o: { id: string; name: string; jvris_id: string | null }) =>
          o.name.toLowerCase() === rowOrgName.toLowerCase()
      );

      if (!org) {
        skipped++;
        continue;
      }

      // Apenas atualizar se o jvris_id for diferente do atual (evitar writes desnecessários)
      if (org.jvris_id === rowJvrisId) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ jvris_id: rowJvrisId })
        .eq("id", org.id);

      if (updateError) {
        console.error(`[SSO-CCA][Jvris][Orgs] Erro ao atualizar "${org.name}":`, updateError.message);
      } else {
        updated++;
        console.log(`[SSO-CCA][Jvris][Orgs] Org "${org.name}" → jvris_id: ${rowJvrisId}`);
      }
    }

    console.log(`[SSO-CCA][Jvris][Orgs] Sync concluído: ${updated} atualizadas, ${skipped} sem alteração`);
  } catch (err) {
    console.error("[SSO-CCA][Jvris][Orgs] Erro inesperado no sync (login não afetado):", err instanceof Error ? err.message : err);
  }
}

/**
 * Lê o ficheiro Excel do SharePoint e procura o ID Jvris correspondente ao email
 * do utilizador que fez login.
 *
 * Esta função é completamente não-bloqueante: qualquer erro é registado em log
 * mas nunca impede o login.
 *
 * @returns ID Jvris (ex: "C.0042") ou null se não encontrado / erro
 */
async function lookupJvrisIdFromSharePoint(email: string): Promise<string | null> {
  try {
    // Passo 1: obter token Graph
    const graphToken = await getGraphToken();
    if (!graphToken) return null;

    // Passo 2: localizar o ficheiro no SharePoint
    const downloadUrl = await findJvrisFileDownloadUrl(graphToken);
    if (!downloadUrl) return null;

    // Passo 3: descarregar o ficheiro Excel
    console.log("[SSO-CCA][Jvris] A descarregar ficheiro de mapeamento...");
    const fileResp = await fetch(downloadUrl);
    if (!fileResp.ok) {
      console.error(`[SSO-CCA][Jvris] Falha ao descarregar ficheiro: ${fileResp.status}`);
      return null;
    }

    const fileBuffer = await fileResp.arrayBuffer();

    // Passo 4: parsear o Excel (primeira folha)
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      console.log("[SSO-CCA][Jvris] Ficheiro Excel sem folhas");
      return null;
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      console.log("[SSO-CCA][Jvris] Ficheiro vazio");
      return null;
    }

    // Passo 5: identificar colunas de email e jvris_id pelos cabeçalhos
    const headers = Object.keys(rows[0]);
    let emailCol: string | null = null;
    let jvrisCol: string | null = null;

    for (const h of headers) {
      const normalized = normalizeHeader(h);
      if (!emailCol && EMAIL_COL_CANDIDATES.includes(normalized)) emailCol = h;
      if (!jvrisCol && JVRIS_COL_CANDIDATES.includes(normalized)) jvrisCol = h;
    }

    if (!emailCol || !jvrisCol) {
      console.log(
        `[SSO-CCA][Jvris] Colunas não identificadas. ` +
        `Cabeçalhos encontrados: [${headers.join(", ")}]. ` +
        `Esperado: coluna de email (${EMAIL_COL_CANDIDATES.join("/")}) ` +
        `e coluna de ID Jvris (${JVRIS_COL_CANDIDATES.join("/")})`
      );
      return null;
    }

    console.log(`[SSO-CCA][Jvris] Colunas identificadas — email: "${emailCol}", jvris_id: "${jvrisCol}". Linhas: ${rows.length}`);

    // Passo 6: procurar a linha com o email do utilizador (case-insensitive)
    const emailLower = email.toLowerCase();
    const matchRow = rows.find((row) => {
      const rowEmail = String(row[emailCol!] || "").toLowerCase().trim();
      return rowEmail === emailLower;
    });

    if (!matchRow) {
      console.log(`[SSO-CCA][Jvris] Email não encontrado no ficheiro — sem ID Jvris para este utilizador`);
      return null;
    }

    const jvrisId = String(matchRow[jvrisCol] || "").trim();
    if (!jvrisId) {
      console.log(`[SSO-CCA][Jvris] Linha encontrada mas ID Jvris está vazio`);
      return null;
    }

    console.log(`[SSO-CCA][Jvris] ID Jvris encontrado: ${jvrisId}`);
    return jvrisId;
  } catch (err) {
    // Nunca bloquear o login por falha no lookup Jvris
    console.error("[SSO-CCA][Jvris] Erro inesperado no lookup (login não afetado):", err instanceof Error ? err.message : err);
    return null;
  }
}

// Decode JWT ID token payload (signature already validated by token exchange)
function decodeIdToken(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    // Handle URL-safe base64
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Decode base64 to binary string
    const binaryString = atob(payload);
    // Convert binary string to Uint8Array for proper UTF-8 decoding
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Decode UTF-8 bytes to string (handles multi-byte chars like "í")
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Generate and store state in database for persistence across instances
// deno-lint-ignore no-explicit-any
async function generateAndStoreState(supabase: any): Promise<{ state: string; nonce: string }> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  const { error } = await supabase.from("sso_states").insert({
    state,
    nonce,
  });
  
  if (error) {
    console.error("[SSO-CCA] Failed to store state:", error.message);
    throw new Error("Failed to generate state");
  }
  
  return { state, nonce };
}

// Validate and consume state (one-time use) - prevents replay attacks
// Returns the stored nonce so the caller can validate it against the ID token claim
// deno-lint-ignore no-explicit-any
async function validateAndConsumeState(supabase: any, state: string): Promise<{ valid: boolean; nonce?: string; error?: string }> {
  // Delete and return the state atomically - ensures one-time use
  const { data, error } = await supabase
    .from("sso_states")
    .delete()
    .eq("state", state)
    .gt("expires_at", new Date().toISOString())
    .select()
    .maybeSingle();

  if (error) {
    console.error("[SSO-CCA] Database error validating state:", error.message);
    return { valid: false, error: "state_validation_error" };
  }

  if (!data) {
    return { valid: false, error: "state_not_found_or_expired" };
  }

  return { valid: true, nonce: data.nonce as string | undefined };
}

// Validation helpers
function validateCode(code: unknown): { valid: boolean; error?: string } {
  if (typeof code !== "string") {
    return { valid: false, error: "code_must_be_string" };
  }
  if (code.length === 0) {
    return { valid: false, error: "code_required" };
  }
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, error: "code_too_long" };
  }
  // OAuth 2.0 authorization codes (RFC 6749) may contain any printable ASCII character (VSCHAR).
  // The previous restrictive regex rejected valid codes from some providers (e.g. codes with '!', '*', '@').
  // Allow all printable ASCII (0x21 '!' through 0x7E '~') — the code is URL-encoded before use so no injection risk.
  if (!/^[\x21-\x7E]+$/.test(code)) {
    return { valid: false, error: "code_invalid_format" };
  }
  return { valid: true };
}

function validateStateFormat(state: unknown): { valid: boolean; error?: string } {
  if (state === null || state === undefined) {
    return { valid: false, error: "state_required" };
  }
  if (typeof state !== "string") {
    return { valid: false, error: "state_must_be_string" };
  }
  if (state.length === 0) {
    return { valid: false, error: "state_required" };
  }
  if (state.length > MAX_STATE_LENGTH) {
    return { valid: false, error: "state_too_long" };
  }
  // State should be UUID format or alphanumeric
  if (!UUID_REGEX.test(state) && !ALPHANUMERIC_REGEX.test(state)) {
    return { valid: false, error: "state_invalid_format" };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  console.log(`[SSO-CCA] === Function invoked === method=${req.method} url=${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[SSO-CCA] CORS preflight - returning 204");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[SSO-CCA] Parsed path: "${path}" | method: ${req.method}`);
  console.log(`[SSO-CCA] Config check: clientId=${SSO_CONFIG.clientId ? "SET" : "MISSING"}, issuerUrl=${SSO_CONFIG.issuerUrl ? "SET" : "MISSING"}, redirectUrl=${SSO_CONFIG.redirectUrl ? "SET" : "MISSING"}, clientSecret=${SSO_CONFIG.clientSecret ? "SET" : "MISSING"}`);

  // Create Supabase client with service role for all operations.
  // CRITICAL: persistSession must be false so that verifyOtp does NOT change
  // the client's auth context from service_role to the authenticated user.
  // Without this, all DB operations after verifyOtp would run with user-level
  // RLS instead of service_role, silently failing on tables like sso_admin_emails
  // and platform_admins.
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if SSO is configured
    if (!SSO_CONFIG.clientId || !SSO_CONFIG.issuerUrl) {
      console.error("[SSO-CCA] SSO NOT CONFIGURED - missing client ID or issuer URL. Set CCA_SSO_CLIENT_ID and CCA_SSO_ISSUER_URL secrets.");
      return new Response(
        JSON.stringify({
          error: "SSO not configured",
          message: "SSO CCA ainda não está configurado. Por favor, configure as credenciais do IdP.",
          configured: false,
          debug: {
            hasClientId: !!SSO_CONFIG.clientId,
            hasIssuerUrl: !!SSO_CONFIG.issuerUrl,
            hasClientSecret: !!SSO_CONFIG.clientSecret,
            hasRedirectUrl: !!SSO_CONFIG.redirectUrl,
          },
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /start - Initiate SSO flow
    if (path.endsWith("/start")) {
      console.log("[SSO-CCA] Starting SSO flow");

      // Generate secure state + nonce and store in database for persistence
      const { state, nonce } = await generateAndStoreState(supabase);

      // Build OIDC authorization URL
      // Include GroupMember.Read.All so Microsoft includes groups claim in the ID token
      // nonce is required by OIDC spec to prevent replay attacks via ID token
      const authParams = new URLSearchParams({
        client_id: SSO_CONFIG.clientId,
        redirect_uri: SSO_CONFIG.redirectUrl,
        response_type: "code",
        scope: "openid email profile GroupMember.Read.All",
        state: state,
        nonce: nonce,
      });

      const authUrl = `${SSO_CONFIG.issuerUrl}/authorize?${authParams.toString()}`;

      console.log(`[SSO-CCA] Redirecting to IdP with state: ${state.substring(0, 8)}...`);

      return new Response(
        JSON.stringify({
          authUrl,
          state,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /callback - Handle SSO callback
    if (path.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      console.log("[SSO-CCA] Callback received");

      if (error) {
        const sanitizedError = error.substring(0, 100).replace(/[^\w\s-]/g, '');
        console.error(`[SSO-CCA] IdP error: ${sanitizedError}`);
        return new Response(
          JSON.stringify({
            error: "sso_error",
            message: "Erro no processo de autenticação SSO",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate state format first
      const stateFormatValidation = validateStateFormat(state);
      if (!stateFormatValidation.valid) {
        console.error(`[SSO-CCA] Invalid state format: ${stateFormatValidation.error}`);
        return new Response(
          JSON.stringify({
            error: "invalid_state",
            message: "Estado de autenticação inválido ou ausente",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate state against database (CSRF protection + one-time use)
      // Also retrieves stored nonce for later validation against the ID token claim
      const storedStateValidation = await validateAndConsumeState(supabase, state!);
      if (!storedStateValidation.valid) {
        console.error(`[SSO-CCA] State validation failed: ${storedStateValidation.error}`);
        return new Response(
          JSON.stringify({
            error: "invalid_state",
            message: "Estado de autenticação inválido, expirado ou já utilizado",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate code
      const codeValidation = validateCode(code);
      if (!codeValidation.valid) {
        console.error(`[SSO-CCA] Invalid code: ${codeValidation.error}`);
        return new Response(
          JSON.stringify({
            error: codeValidation.error,
            message: "Código de autorização inválido",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Exchange code for tokens
      console.log("[SSO-CCA] Exchanging code for tokens");
      
      const tokenResponse = await fetch(`${SSO_CONFIG.issuerUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${SSO_CONFIG.clientId}:${SSO_CONFIG.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code!,
          redirect_uri: SSO_CONFIG.redirectUrl,
        }),
      });

      if (!tokenResponse.ok) {
        console.error(`[SSO-CCA] Token exchange failed: ${tokenResponse.status}`);
        return new Response(
          JSON.stringify({
            error: "token_exchange_failed",
            message: "Falha na troca de tokens",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokens = await tokenResponse.json();
      console.log("[SSO-CCA] Tokens received");

      // Extract user info from ID token (Microsoft Entra ID compatible)
      const idToken = tokens.id_token;
      if (!idToken) {
        console.error("[SSO-CCA] No ID token in response");
        return new Response(
          JSON.stringify({
            error: "missing_id_token",
            message: "Token de identificação não recebido do IdP",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const userInfo = decodeIdToken(idToken);
      if (!userInfo) {
        console.error("[SSO-CCA] Failed to decode ID token");
        return new Response(
          JSON.stringify({
            error: "invalid_id_token",
            message: "Falha ao processar token de identificação",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("[SSO-CCA] User info extracted from ID token");

      // Validate nonce (OIDC replay attack prevention)
      // If the IdP returned a nonce claim in the ID token, it must match what we sent.
      // Skip validation if the IdP omitted the nonce claim (not all providers echo it back).
      const storedNonce = storedStateValidation.nonce;
      const tokenNonce = userInfo.nonce as string | undefined;
      if (storedNonce && tokenNonce && tokenNonce !== storedNonce) {
        console.error("[SSO-CCA] Nonce mismatch — potential ID token replay attack");
        return new Response(
          JSON.stringify({
            error: "nonce_mismatch",
            message: "Falha na validação de segurança da autenticação",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Extract email (Microsoft Entra ID uses different claims)
      const email = (userInfo.email || userInfo.preferred_username || userInfo.upn) as string | undefined;
      if (!email || typeof email !== "string") {
        console.error("[SSO-CCA] No email in ID token");
        return new Response(
          JSON.stringify({
            error: "missing_email",
            message: "Email não fornecido pelo IdP",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[SSO-CCA] User info received for: ${email.substring(0, 3)}***`);

      // Extract name (fallback to email prefix)
      const userName = (userInfo.name || email.split("@")[0]) as string;

      // Extract external ID (Microsoft uses 'oid', standard OIDC uses 'sub')
      const externalId = String(userInfo.oid || userInfo.sub || "").substring(0, 255);

      // ── platform_users soft lookup ──────────────────────────────────────────
      // If the user exists in platform_users (pre-seeded), use their data for
      // profile enrichment. If not found, fall back to JIT provisioning.
      let platformUser: {
        full_name: string | null;
        role: string | null;
        department: string | null;
        job_title: string | null;
      } | null = null;

      try {
        const { data: puData, error: puError } = await supabase
          .from("platform_users")
          .select("full_name, role, department, job_title")
          .eq("email", email)
          .maybeSingle();

        if (puError && puError.code !== "42P01") {
          // Log error but don't block login (soft check)
          console.error("[SSO-CCA] platform_users lookup error:", puError.message);
        } else if (puError?.code === "42P01") {
          console.log("[SSO-CCA] platform_users table not found — skipping lookup");
        } else if (puData) {
          platformUser = puData;
          console.log(`[SSO-CCA] platform_users: found pre-seeded data for ${email.substring(0, 3)}***`);

          // Mark user as active and update last access timestamp
          await supabase
            .from("platform_users")
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq("email", email);
        } else {
          console.log("[SSO-CCA] platform_users: no record found — using JIT provisioning");
        }
      } catch (puCatchError) {
        console.error("[SSO-CCA] platform_users lookup exception:", puCatchError instanceof Error ? puCatchError.message : puCatchError);
      }

      // Use platform_users name if available, otherwise Azure AD token name
      const effectiveName = (platformUser?.full_name || userName).substring(0, 255).trim();

      // Validate email domain
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (!emailDomain || !SSO_CONFIG.allowedDomains.includes(emailDomain)) {
        console.error(`[SSO-CCA] Domain not allowed: ${emailDomain}`);
        return new Response(
          JSON.stringify({
            error: "domain_not_allowed",
            message: "Domínio de email não autorizado para SSO",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if user already has a profile (maybeSingle: no error if 0 rows)
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email, nome_completo")
        .eq("email", email)
        .maybeSingle();

      let userId: string;

      if (existingUser) {
        // Profile found — update SSO fields (use platform_users data if available)
        console.log(`[SSO-CCA] Updating existing user`);

        await supabase
          .from("profiles")
          .update({
            auth_method: "sso_cca",
            sso_provider: "cca",
            sso_external_id: externalId,
            nome_completo: effectiveName,
            last_login_at: new Date().toISOString(),
            login_attempts: 0,
            locked_until: null,
            ...(platformUser?.department ? { departamento: platformUser.department } : {}),
            ...(platformUser?.job_title ? { cargo: platformUser.job_title } : {}),
            // Auto-complete onboarding for SSO users with pre-seeded data
            ...(platformUser ? { onboarding_completed: true } : {}),
          })
          .eq("id", existingUser.id);

        userId = existingUser.id;
      } else {
        // No profile found — attempt JIT provisioning
        console.log(`[SSO-CCA] No profile found — attempting JIT provisioning`);

        // Try to create auth user; if it already exists (e.g. trigger delay), look it up instead
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            nome_completo: effectiveName,
            auth_method: "sso_cca",
          },
        });

        if (authError) {
          // User already exists in auth.users but has no profile yet (trigger delay or failure)
          if (authError.message?.includes("already been registered") || authError.status === 422) {
            console.log(`[SSO-CCA] Auth user already exists — looking up by email`);
            const { data: { users: existingAuthUsers }, error: listError } =
              await supabase.auth.admin.listUsers();
            const found = !listError && existingAuthUsers?.find((u) => u.email === email);
            if (!found) {
              console.error(`[SSO-CCA] Could not resolve existing auth user for ${email.substring(0, 3)}***`);
              return new Response(
                JSON.stringify({ error: "user_lookup_failed", message: "Falha ao identificar utilizador existente" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            userId = found.id;
            console.log(`[SSO-CCA] Resolved existing auth user, will upsert profile`);
          } else {
            console.error(`[SSO-CCA] Failed to create auth user: ${authError.message}`);
            return new Response(
              JSON.stringify({ error: "user_creation_failed", message: "Falha ao criar utilizador" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          userId = authUser.user.id;
        }

        // Upsert profile with SSO info (handles both new user and trigger-delayed profile)
        // Auto-complete onboarding when platform_users data is available (all data pre-seeded)
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            email: email,
            nome_completo: effectiveName,
            auth_method: "sso_cca",
            sso_provider: "cca",
            sso_external_id: externalId,
            last_login_at: new Date().toISOString(),
            ...(platformUser?.department ? { departamento: platformUser.department } : {}),
            ...(platformUser?.job_title ? { cargo: platformUser.job_title } : {}),
            ...(platformUser ? { onboarding_completed: true } : {}),
          }, { onConflict: "id" });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 1: All admin/database operations (runs as service_role)
      // These MUST happen before verifyOtp which could affect the client's
      // auth context. With persistSession:false this shouldn't happen, but
      // we keep admin ops first as a defensive measure.
      // ═══════════════════════════════════════════════════════════════════════

      // Auto-assign SSO users to CCA_Teste organization using SECURITY DEFINER function
      const CCA_TESTE_ORG_ID = "e33bf0c9-71b9-491b-8054-d4c88d8bb4ee";

      // ── Step 1: Check sso_admin_emails table (highest priority) ──────────────
      const { data: emailAdminConfig, error: emailAdminError } = await supabase
        .from("sso_admin_emails")
        .select("role")
        .eq("email", email)
        .maybeSingle();

      // If the table doesn't exist yet (migration not applied), skip email admin check
      const emailTableExists = !emailAdminError || emailAdminError.code !== "42P01";
      if (emailAdminError && emailAdminError.code === "42P01") {
        console.log("[SSO-CCA] sso_admin_emails table not found — skipping email admin check");
      } else if (emailAdminError) {
        console.error("[SSO-CCA] Error querying sso_admin_emails:", emailAdminError.message);
      }

      // ── Step 2: Determine role ─────────────────────────────────────────────
      const adminGroupId = Deno.env.get("CCA_SSO_GROUP_ADMIN") || "";
      const managerGroupId = Deno.env.get("CCA_SSO_GROUP_MANAGER") || "";

      // Handle Microsoft Entra groups claim overflow (~200+ groups)
      // When overflow occurs, 'groups' is absent and '_claim_names' is present
      let userGroups: string[] = [];

      if (Array.isArray(userInfo.groups) && userInfo.groups.length > 0) {
        userGroups = userInfo.groups as string[];
        console.log(`[SSO-CCA] User groups from token claim: ${userGroups.length} groups`);
      } else if (userInfo._claim_names || userInfo.hasgroups) {
        // Groups overflow — fetch from Microsoft Graph API
        console.log(`[SSO-CCA] Groups claim overflow detected (_claim_names present or hasgroups=true), fetching from Graph API`);
        try {
          const graphResponse = await fetch(
            "https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.group?$select=id,displayName&$top=999",
            {
              headers: {
                "Authorization": `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (graphResponse.ok) {
            const graphData = await graphResponse.json();
            userGroups = (graphData.value || []).map((g: { id: string }) => g.id);
            console.log(`[SSO-CCA] Fetched ${userGroups.length} groups from Graph API`);
          } else {
            console.error(`[SSO-CCA] Graph API error: ${graphResponse.status} ${graphResponse.statusText}`);
          }
        } catch (graphErr) {
          console.error(`[SSO-CCA] Failed to fetch groups from Graph API:`, graphErr instanceof Error ? graphErr.message : graphErr);
        }
      } else {
        console.log(`[SSO-CCA] No groups claim and no overflow indicator — user has no groups`);
      }

      console.log(`[SSO-CCA] Final user groups for role mapping: ${JSON.stringify(userGroups.slice(0, 10))}${userGroups.length > 10 ? `... (${userGroups.length} total)` : ""}`);

      let assignedRole = "editor"; // default role for all CCA SSO users
      let roleSource = "default";

      if (emailAdminConfig) {
        // Email table takes priority over group membership
        assignedRole = emailAdminConfig.role;
        roleSource = "sso_admin_emails";
        console.log(`[SSO-CCA] Role from sso_admin_emails: ${assignedRole}`);
      } else if (adminGroupId && userGroups.includes(adminGroupId)) {
        assignedRole = "admin";
        roleSource = "entra_admin_group";
        console.log(`[SSO-CCA] User is in LegalHub_Admin group → role: admin`);
      } else if (managerGroupId && userGroups.includes(managerGroupId)) {
        assignedRole = "admin";
        roleSource = "entra_manager_group";
        console.log(`[SSO-CCA] User is in LegalHub_Manager group → role: admin`);
      } else {
        console.log(`[SSO-CCA] User not in specific groups and not in sso_admin_emails → default role: editor`);
      }

      console.log(`[SSO-CCA] Final role: ${assignedRole} (source: ${roleSource})`);

      // ── Step 3: Sync platform_admins ──────────────────────────────────────
      const DEMO_USER_ID = "1f7308ec-f9be-4a6a-96d5-b8ec4c98527b";
      const isPlatformAdmin =
        (emailAdminConfig && emailAdminConfig.role === "admin") ||
        (adminGroupId && userGroups.includes(adminGroupId));

      if (isPlatformAdmin) {
        // Upsert into platform_admins — idempotent, safe to call on every login
        const { error: paError } = await supabase
          .from("platform_admins")
          .upsert({ user_id: userId }, { onConflict: "user_id" });
        if (paError) {
          console.error(`[SSO-CCA] Failed to upsert platform_admins:`, paError.message);
        } else {
          console.log(`[SSO-CCA] User added/confirmed in platform_admins (source: ${roleSource})`);
        }
      } else if (emailTableExists) {
        // Only remove from platform_admins when we have a confirmed result from sso_admin_emails.
        // If the table didn't exist (emailTableExists=false), we skip the delete to avoid wiping
        // manually-inserted admin records when the migration hasn't been applied yet.
        const { error: paError } = await supabase
          .from("platform_admins")
          .delete()
          .eq("user_id", userId)
          .neq("user_id", DEMO_USER_ID);
        if (paError) {
          console.error(`[SSO-CCA] Failed to remove from platform_admins:`, paError.message);
        } else {
          console.log(`[SSO-CCA] User not in admin list — removed from platform_admins`);
        }
      } else {
        console.log(`[SSO-CCA] sso_admin_emails table unavailable — skipping platform_admins sync to preserve manually-set admins`);
      }

      // ── Step 4: Assign user to CCA organization ────────────────────────────
      console.log(`[SSO-CCA] Assigning user to CCA_Teste organization via RPC with role: ${assignedRole}`);

      const { error: assignError } = await supabase
        .rpc("assign_sso_user_to_organization", {
          p_user_id: userId,
          p_organization_id: CCA_TESTE_ORG_ID,
          p_role: assignedRole
        });

      if (assignError) {
        console.error(`[SSO-CCA] RPC assign_sso_user_to_organization failed:`, assignError.message, assignError);
        // Fallback: direct INSERT into organization_members
        console.log(`[SSO-CCA] Attempting direct INSERT fallback for org membership`);
        const { error: directInsertError } = await supabase
          .from("organization_members")
          .upsert(
            { organization_id: CCA_TESTE_ORG_ID, user_id: userId, role: assignedRole },
            { onConflict: "organization_id,user_id" }
          );
        if (directInsertError) {
          console.error(`[SSO-CCA] CRITICAL: Direct INSERT fallback also failed:`, directInsertError.message);
        } else {
          console.log(`[SSO-CCA] Direct INSERT fallback succeeded — user assigned to CCA_Teste`);
        }
      } else {
        console.log(`[SSO-CCA] Successfully assigned user to CCA_Teste with role: ${assignedRole}`);
      }

      // ── Step 5: Update profile with org assignment ─────────────────────
      // ALWAYS set current_organization_id to CCA (even if already set to something else).
      // Do NOT force onboarding_completed — SSO users must go through onboarding
      // to select their department and role on first login.
      const { error: orgUpdateError } = await supabase
        .from("profiles")
        .update({
          current_organization_id: CCA_TESTE_ORG_ID,
        })
        .eq("id", userId);

      if (orgUpdateError) {
        console.error(`[SSO-CCA] Failed to set current_organization_id:`, orgUpdateError.message);
      } else {
        console.log(`[SSO-CCA] current_organization_id set to CCA for SSO user`);
      }

      // ── Step 6: Lookup e indexação do ID Jvris (não-bloqueante) ─────────────
      // Executa em paralelo dois processos independentes:
      //   a) Lookup do ID Jvris do utilizador (profiles.jvris_id) pelo seu email
      //   b) Sync do mapeamento organização → jvris_id (organizations.jvris_id)
      // O login NÃO é bloqueado em caso de falha em nenhum dos dois.
      let jvrisId: string | null = null;
      try {
        const [userJvrisId] = await Promise.allSettled([
          lookupJvrisIdFromSharePoint(email),
          syncOrgsJvrisIdFromSharePoint(supabase),
        ]);

        // Resultado do lookup do utilizador
        if (userJvrisId.status === "fulfilled" && userJvrisId.value) {
          jvrisId = userJvrisId.value;
          const { error: jvrisUpdateError } = await supabase
            .from("profiles")
            .update({ jvris_id: jvrisId })
            .eq("id", userId);

          if (jvrisUpdateError) {
            console.error(`[SSO-CCA][Jvris] Falha ao guardar jvris_id no perfil:`, jvrisUpdateError.message);
          } else {
            console.log(`[SSO-CCA][Jvris] jvris_id guardado no perfil: ${jvrisId}`);
          }
        } else {
          console.log(`[SSO-CCA][Jvris] ID Jvris do utilizador não encontrado — perfil fica sem jvris_id`);
        }
      } catch (jvrisErr) {
        // Garantia extra: qualquer erro aqui não deve interromper o fluxo de login
        console.error("[SSO-CCA][Jvris] Erro inesperado no lookup (login não afetado):", jvrisErr instanceof Error ? jvrisErr.message : jvrisErr);
      }

      // Log authentication activity
      await supabase.from("auth_activity_logs").insert([{
        user_id: userId,
        auth_method: "sso_cca",
        action: "login",
        success: true,
        metadata: {
          idp: "cca",
          role: assignedRole,
          roleSource: roleSource,
          orgAssigned: !assignError,
          jvrisIdFound: !!jvrisId,
        },
      }]);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 2: Generate session (LAST step — after all admin ops are done)
      // ═══════════════════════════════════════════════════════════════════════
      console.log("[SSO-CCA] Generating session for user");

      // Step 1: Generate magic link hash
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error("[SSO-CCA] Failed to generate link:", linkError?.message);
        return new Response(
          JSON.stringify({
            error: "session_generation_failed",
            message: "Falha ao gerar sessão",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Step 2: Verify OTP to create real session with tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

      if (sessionError || !sessionData?.session) {
        console.error("[SSO-CCA] Failed to verify OTP:", sessionError?.message);
        return new Response(
          JSON.stringify({
            error: "session_verification_failed",
            message: "Falha ao verificar sessão",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[SSO-CCA] SSO login successful for user ${userId}`);

      // Return complete session to frontend
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: userId,
            email: email,
            name: userName,
          },
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /status - Check SSO configuration status
    if (path.endsWith("/status")) {
      return new Response(
        JSON.stringify({
          configured: !!(SSO_CONFIG.clientId && SSO_CONFIG.issuerUrl),
          domainsConfigured: SSO_CONFIG.allowedDomains.length > 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Unknown route
    console.error(`[SSO-CCA] Unknown route: "${path}" — valid routes: /start, /callback, /status`);
    return new Response(
      JSON.stringify({
        error: "not_found",
        message: "Endpoint não encontrado",
        receivedPath: path,
        validRoutes: ["/start", "/callback", "/status"],
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[SSO-CCA] Unhandled error: ${errorMsg}`);
    if (errorStack) console.error(`[SSO-CCA] Stack: ${errorStack}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro interno do servidor",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
