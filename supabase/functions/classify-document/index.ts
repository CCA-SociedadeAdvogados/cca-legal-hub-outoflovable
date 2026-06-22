import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { extractText } from "../_shared/extractText.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

/**
 * classify-document
 *
 * Lê o conteúdo de um documento (PDF/Word/texto) e sugere, via Claude:
 *  - um nome claro (sem extensão),
 *  - o tipo de documento,
 *  - a pasta de destino recomendada (entre as existentes ou uma nova concisa).
 *
 * Não grava nada — apenas devolve sugestões para o cliente confirmar/ajustar
 * antes do upload. Autorização: membro da org (ou CCA/admin/service role).
 */

const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 12_000;

async function callClaude(apiKey: string, system: string, user: string): Promise<string> {
  return anthropicMessage({ apiKey, model: CLAUDE_HAIKU, system, user, maxTokens: 400 });
}

function parseJSON(content: string): Record<string, unknown> {
  let s = content.trim();
  const fence = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) s = fence[1].trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { organization_id, file_base64, file_name, existing_folders } = await req.json();
    if (!organization_id || !file_base64 || !file_name) {
      return new Response(
        JSON.stringify({ error: "organization_id, file_base64 e file_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (!(await isAuthorizedForOrg(req, supabase, organization_id))) {
      return new Response(JSON.stringify({ error: "Forbidden: sem acesso a esta organização" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Descodificar e extrair texto
    const binary = atob(file_base64);
    if (binary.length > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: "Ficheiro demasiado grande para classificar" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const text = (await extractText(bytes, file_name)).slice(0, MAX_TEXT_CHARS);

    const folders = Array.isArray(existing_folders)
      ? (existing_folders as string[]).filter((f) => typeof f === "string" && f.trim()).slice(0, 60)
      : [];

    const system = `És um assistente de arquivo documental de uma sociedade de advogados.
Analisa o documento e responde APENAS com JSON válido (sem markdown), na forma:
{
  "suggested_name": "nome claro e curto, SEM extensão de ficheiro, em português",
  "doc_type": "tipo do documento em 1-3 palavras (ex: Contrato, Procuração, Fatura, Certidão, RGPD)",
  "suggested_folder": "pasta de destino recomendada",
  "is_new_folder": true|false
}
Regras:
- O nome deve identificar o documento (partes, objeto ou referência), não inventes dados.
- Para "suggested_folder": se uma das pastas existentes servir, usa exatamente esse nome e is_new_folder=false. Caso contrário, propõe um nome de pasta conciso e is_new_folder=true.
- Responde em português europeu.

Pastas existentes: ${folders.length ? folders.join(", ") : "(nenhuma)"}`;

    const userMsg = `Nome do ficheiro: ${file_name}

Conteúdo extraído (pode estar truncado):
${text || "[sem texto extraível — documento possivelmente digitalizado/imagem]"}`;

    const raw = await callClaude(ANTHROPIC_API_KEY, system, userMsg);
    let suggestion: Record<string, unknown>;
    try {
      suggestion = parseJSON(raw);
    } catch {
      throw new Error("Não foi possível interpretar a sugestão da IA");
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: {
          suggested_name: String(suggestion.suggested_name ?? "").slice(0, 120),
          doc_type: String(suggestion.doc_type ?? "").slice(0, 60),
          suggested_folder: String(suggestion.suggested_folder ?? "").slice(0, 80),
          is_new_folder: Boolean(suggestion.is_new_folder),
          has_text: !!text,
        },
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[classify-document] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
