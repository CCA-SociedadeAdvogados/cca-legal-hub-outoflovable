import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { getGraphToken } from "../_shared/graph.ts";
import { extractText } from "../_shared/extractText.ts";

/**
 * index-client-documents
 *
 * Extrai o texto dos documentos das pastas SharePoint de uma organização e
 * guarda-o em client_document_text (com full-text search). Permite ao
 * portal-assistant pesquisar e citar o conteúdo dos documentos do cliente.
 *
 * Incremental: salta documentos já indexados e não alterados desde a última
 * extração. Limita o número por execução para evitar timeouts.
 *
 * Autorização: membro da org, CCA, platform admin ou service role.
 */

const MAX_DOCS_PER_RUN = 40;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 200_000; // limita o texto guardado por documento

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { organization_id } = await req.json().catch(() => ({}));
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!(await isAuthorizedForOrg(req, supabase, organization_id))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Config SharePoint da org (para o drive)
    const { data: config } = await supabase
      .from("sharepoint_config")
      .select("site_id, drive_id")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (!config?.site_id) {
      return new Response(JSON.stringify({ error: "SharePoint não configurado para esta organização" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const token = await getGraphToken();
    let driveId = config.drive_id as string | null;
    if (!driveId) {
      const driveRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!driveRes.ok) throw new Error(`Falha ao resolver drive: ${driveRes.status}`);
      driveId = (await driveRes.json()).id;
    }

    // Documentos (ficheiros) da org, não eliminados
    const { data: docs } = await supabase
      .from("sharepoint_documents")
      .select("id, sharepoint_item_id, name, mime_type, size_bytes, web_url, folder_path, sharepoint_modified_at")
      .eq("organization_id", organization_id)
      .eq("is_folder", false)
      .eq("is_deleted", false)
      .order("sharepoint_modified_at", { ascending: false })
      .limit(300);

    // Texto já indexado (para saltar o que não mudou)
    const { data: indexed } = await supabase
      .from("client_document_text")
      .select("sharepoint_document_id, source_modified_at")
      .eq("organization_id", organization_id);
    const indexedMap = new Map(
      (indexed ?? []).map((r) => [r.sharepoint_document_id, r.source_modified_at]),
    );

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of docs ?? []) {
      if (processed >= MAX_DOCS_PER_RUN) break;
      if (doc.size_bytes && doc.size_bytes > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }
      // Saltar se já indexado e não alterado
      const prev = indexedMap.get(doc.id);
      if (prev && doc.sharepoint_modified_at && new Date(prev) >= new Date(doc.sharepoint_modified_at)) {
        skipped++;
        continue;
      }

      try {
        const contentRes = await fetch(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${doc.sharepoint_item_id}/content`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!contentRes.ok) {
          failed++;
          continue;
        }
        const bytes = new Uint8Array(await contentRes.arrayBuffer());
        const text = (await extractText(bytes, doc.name, doc.mime_type)).slice(0, MAX_CHARS);

        const { error: upsertError } = await supabase.from("client_document_text").upsert(
          {
            organization_id,
            sharepoint_document_id: doc.id,
            name: doc.name,
            folder_path: doc.folder_path,
            web_url: doc.web_url,
            content: text,
            char_count: text.length,
            source_modified_at: doc.sharepoint_modified_at,
            extracted_at: new Date().toISOString(),
          },
          { onConflict: "sharepoint_document_id" },
        );
        if (upsertError) {
          console.warn(`[index-client-documents] upsert ${doc.name}:`, upsertError.message);
          failed++;
          continue;
        }
        processed++;
      } catch (e) {
        console.warn(`[index-client-documents] ${doc.name}:`, e instanceof Error ? e.message : e);
        failed++;
      }
    }

    const remaining = (docs?.length ?? 0) - processed - skipped - failed;
    return new Response(
      JSON.stringify({ success: true, processed, skipped, failed, remaining }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[index-client-documents] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
