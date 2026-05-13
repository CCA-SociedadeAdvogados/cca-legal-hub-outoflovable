import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * provision-client-sharepoint
 *
 * Cria automaticamente a estrutura de pastas SharePoint para um novo cliente
 * e actualiza sharepoint_config + organizations.legalbi_url.
 *
 * Utiliza as credenciais globais da CCA (SHAREPOINT_*) e o site/drive
 * configurado em CCA_SHAREPOINT_SITE_ID + CCA_SHAREPOINT_DRIVE_ID.
 *
 * Estrutura criada:
 *   Clientes/{client_code} - {client_name}/
 *     ├── Contratos/
 *     ├── Financeiro/
 *     ├── Correspondência/
 *     └── LegalBI/
 */

import { corsHeaders } from "../_shared/cors.ts";

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
    throw new Error(`Falha ao obter access token: ${response.status} — ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.access_token;
}

/** Cria uma pasta num drive do SharePoint. Retorna o item criado (com webUrl). */
async function createFolder(
  accessToken: string,
  driveId: string,
  parentId: string,
  folderName: string,
): Promise<{ id: string; webUrl: string }> {
  const url = parentId === "root"
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
    : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro a criar pasta "${folderName}": ${res.status} — ${err.slice(0, 300)}`);
  }

  const item = await res.json();
  return { id: item.id, webUrl: item.webUrl };
}

/** Resolve o ID de uma pasta por path. Cria se não existir. */
async function ensureFolder(
  accessToken: string,
  driveId: string,
  folderPath: string,
): Promise<{ id: string; webUrl: string }> {
  // Tentar obter pelo path primeiro
  const encodedPath = encodeURIComponent(folderPath).replace(/%2F/g, "/");
  const getUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}`;

  const getRes = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (getRes.ok) {
    const item = await getRes.json();
    return { id: item.id, webUrl: item.webUrl };
  }

  if (getRes.status !== 404) {
    const err = await getRes.text();
    throw new Error(`Erro ao verificar pasta "${folderPath}": ${getRes.status} — ${err.slice(0, 200)}`);
  }

  // Não existe — criar hierarquia de pastas
  const parts = folderPath.replace(/^\//, "").split("/").filter(Boolean);
  let currentId = "root";
  let currentWebUrl = "";

  for (const part of parts) {
    const created = await createFolder(accessToken, driveId, currentId, part);
    currentId = created.id;
    currentWebUrl = created.webUrl;
  }

  return { id: currentId, webUrl: currentWebUrl };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { organization_id, client_code, client_name } = await req.json();

    if (!organization_id || !client_code || !client_name) {
      return new Response(
        JSON.stringify({ error: "organization_id, client_code e client_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
    const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
    const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
    const siteId = Deno.env.get("CCA_SHAREPOINT_SITE_ID");
    const driveId = Deno.env.get("CCA_SHAREPOINT_DRIVE_ID");

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error("Credenciais SharePoint não configuradas (SHAREPOINT_CLIENT_ID/SECRET/TENANT_ID).");
    }
    if (!siteId || !driveId) {
      throw new Error("Site/Drive SharePoint da CCA não configurados (CCA_SHAREPOINT_SITE_ID/DRIVE_ID).");
    }

    console.log(`[provision-sharepoint] Provisioning client ${client_code} — ${client_name}`);

    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

    // Sanitizar nome para evitar caracteres inválidos no SharePoint
    const safeName = client_name.replace(/[<>:"/\\|?*]/g, "_").trim();
    const rootFolderName = `${client_code} - ${safeName}`;
    const rootFolderPath = `Clientes/${rootFolderName}`;

    // 1. Criar pasta raiz do cliente
    console.log(`[provision-sharepoint] Creating root folder: ${rootFolderPath}`);
    const rootFolder = await ensureFolder(accessToken, driveId, rootFolderPath);

    // 2. Criar subpastas em paralelo
    const [contratosFolder, financeiroFolder, correspondenciaFolder, legalbiFolder] = await Promise.all([
      createFolder(accessToken, driveId, rootFolder.id, "Contratos"),
      createFolder(accessToken, driveId, rootFolder.id, "Financeiro"),
      createFolder(accessToken, driveId, rootFolder.id, "Correspondência"),
      createFolder(accessToken, driveId, rootFolder.id, "LegalBI"),
    ]);

    console.log(`[provision-sharepoint] All folders created. LegalBI webUrl: ${legalbiFolder.webUrl}`);

    // 3. Criar/actualizar sharepoint_config para a organização
    const { error: configError } = await supabase
      .from("sharepoint_config")
      .upsert({
        organization_id,
        site_id: siteId,
        drive_id: driveId,
        root_folder_path: `/${rootFolderPath}`,
        sync_enabled: true,
        sync_interval_minutes: 60,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });

    if (configError) {
      console.error("[provision-sharepoint] Error saving sharepoint_config:", configError);
      throw new Error(`Erro ao guardar config SharePoint: ${configError.message}`);
    }

    // 4. Actualizar legalbi_url da organização com o link directo à pasta LegalBI
    const { error: orgError } = await supabase
      .from("organizations")
      .update({ legalbi_url: legalbiFolder.webUrl })
      .eq("id", organization_id);

    if (orgError) {
      console.error("[provision-sharepoint] Error updating legalbi_url:", orgError);
      // Não bloquear — pastas já criadas, apenas log
    }

    // 5. Audit log (non-blocking)
    try {
      await supabase.from("audit_logs").insert({
        action: "provision_client_sharepoint",
        table_name: "organizations",
        record_id: organization_id,
        user_id: "00000000-0000-0000-0000-000000000000",
        metadata: {
          client_code,
          client_name: safeName,
          root_folder_path: rootFolderPath,
          folders_created: ["Contratos", "Financeiro", "Correspondência", "LegalBI"],
          legalbi_url: legalbiFolder.webUrl,
        },
      });
    } catch (e) {
      console.warn("[provision-sharepoint] Audit log failed:", e);
    }

    console.log(`[provision-sharepoint] Done for ${client_code}`);

    return new Response(
      JSON.stringify({
        success: true,
        root_folder_url: rootFolder.webUrl,
        contratos_folder_url: contratosFolder.webUrl,
        financeiro_folder_url: financeiroFolder.webUrl,
        correspondencia_folder_url: correspondenciaFolder.webUrl,
        legalbi_folder_url: legalbiFolder.webUrl,
        root_folder_path: `/${rootFolderPath}`,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[provision-sharepoint] Error:", error);
    const msg = error instanceof Error ? error.message : "Erro ao provisionar SharePoint";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
