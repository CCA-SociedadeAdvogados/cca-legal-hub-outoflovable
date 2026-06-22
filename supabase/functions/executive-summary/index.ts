import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * executive-summary
 *
 * Gera um resumo executivo em linguagem simples para leitura por não-advogados.
 * Modelo: Claude Haiku 4.5 (tarefa de sumarização simples)
 * Custo estimado: $0,007 por contrato. Resultado é guardado em contract_extractions
 * para não repetir a chamada enquanto o contrato não for alterado.
 */

const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";

import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

async function callClaude(apiKey: string, system: string, user: string, maxTokens = 1024): Promise<string> {
  return anthropicMessage({ apiKey, model: CLAUDE_HAIKU, system, user, maxTokens });
}

function parseJSONResponse(content: string): unknown {
  let jsonStr = content.trim();
  const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (m) jsonStr = m[1].trim();
  const fb = jsonStr.indexOf("{");
  const lb = jsonStr.lastIndexOf("}");
  if (fb !== -1 && lb > fb) jsonStr = jsonStr.slice(fb, lb + 1);

  try { return JSON.parse(jsonStr); } catch { /* try repairs */ }

  let repaired = jsonStr.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(repaired); } catch { /* noop */ }

  let openBraces = 0, openBrackets = 0, inString = false, escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }
  if (openBraces > 0 || openBrackets > 0) {
    repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  }
  return JSON.parse(repaired);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { contract_id, force_regenerate } = await req.json();
    if (!contract_id) {
      return new Response(
        JSON.stringify({ error: "contract_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter dados do contrato (inclui organization_id para autorização)
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        organization_id,
        titulo_contrato, tipo_contrato, objeto_resumido,
        parte_a_nome_legal, parte_b_nome_legal,
        data_inicio_vigencia, data_termo, tipo_renovacao,
        aviso_denuncia_dias, renovacao_periodo_meses,
        valor_total_estimado, moeda, periodicidade_faturacao,
        tratamento_dados_pessoais, existe_dpa_anexo_rgpd, transferencia_internacional,
        flag_confidencialidade, flag_exclusividade, flag_nao_concorrencia,
        obrigacoes_parte_a, obrigacoes_parte_b
      `)
      .eq("id", contract_id)
      .maybeSingle();

    if (contratoError || !contrato) {
      throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
    }

    // Autorização: o chamador tem de pertencer à organização do contrato
    // (ou ser CCA/admin/service role). Impede fuga cross-tenant via service role.
    if (!(await isAuthorizedForOrg(req, supabase, contrato.organization_id))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: sem acesso a este contrato" }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Verificar se já existe resumo em cache
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from("contract_extractions")
        .select("extraction_data, created_at")
        .eq("contrato_id", contract_id)
        .eq("source", "executive_summary")
        .maybeSingle();

      if (existing?.extraction_data) {
        console.log(`[executive-summary] Returning cached summary for ${contract_id}`);
        return new Response(
          JSON.stringify({ success: true, data: existing.extraction_data, cached: true }),
          { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
        );
      }
    }

    const systemPrompt = `Você é um assistente jurídico especializado em explicar contratos em linguagem simples.
Responda APENAS com JSON válido, sem markdown.

Gere um resumo executivo estruturado com esta forma:
{
  "o_que_e": "string - O que é este contrato em 1-2 frases simples",
  "partes": "string - Quem são as partes e qual o papel de cada uma",
  "o_que_importa": ["array de 3-5 pontos chave que o leitor deve saber"],
  "datas_importantes": ["array de datas críticas com contexto (ex: 'Termina em Dez 2026 — sem renovação automática')"],
  "valor": "string ou null - valor e condições de pagamento em linguagem simples",
  "proxima_acao": "string ou null - próxima acção que o cliente deve tomar (ex: 'Confirmar renovação até Setembro 2026')",
  "alertas": ["array de alertas importantes (cláusulas restritivas, prazos críticos, etc.)"]
}`;

    const userMessage = `Crie um resumo executivo simples deste contrato para um gestor não-advogado:

${JSON.stringify(contrato, null, 2)}`;

    console.log(`[executive-summary] Generating for contract ${contract_id}`);
    const content = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userMessage, 1024);

    let summaryData;
    try {
      summaryData = parseJSONResponse(content);
    } catch {
      throw new Error("Erro ao processar resumo da IA");
    }

    // Guardar em cache
    await supabase.from("contract_extractions").upsert({
      contrato_id: contract_id,
      source: "executive_summary",
      status: "success",
      extraction_data: summaryData as Record<string, unknown>,
      job_started_at: new Date().toISOString(),
      job_completed_at: new Date().toISOString(),
    }, { onConflict: "contrato_id,source" });

    return new Response(
      JSON.stringify({ success: true, data: summaryData, cached: false }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[executive-summary] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
