import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

/**
 * analyze-contract-client
 *
 * Analisa um contrato e devolve, em linguagem acessível ao cliente:
 *  - obrigações-chave (radar de obrigações), com responsável e prazo quando há;
 *  - avaliação de risco (grau A–F) com fatores/cláusulas sinalizadas.
 *
 * Resultado guardado em contract_extractions (source='client_analysis') para
 * não repetir a chamada. Autorização: membro da org do contrato (ou CCA/admin).
 */

const CLAUDE_SONNET = "claude-sonnet-4-6";

async function callClaude(apiKey: string, model: string, system: string, user: string, maxTokens = 1400): Promise<string> {
  return anthropicMessage({ apiKey, model, system, user, maxTokens });
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

    const { contract_id, force_regenerate } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Contrato (inclui organization_id para autorização)
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        organization_id,
        titulo_contrato, tipo_contrato, objeto_resumido,
        parte_a_nome_legal, parte_b_nome_legal,
        data_inicio_vigencia, data_termo, data_limite_decisao_renovacao,
        aviso_previo_nao_renovacao_dias, tipo_renovacao,
        valor_total_estimado, moeda,
        tratamento_dados_pessoais, existe_dpa_anexo_rgpd, transferencia_internacional,
        flag_confidencialidade, flag_exclusividade, flag_nao_concorrencia,
        obrigacoes_parte_a, obrigacoes_parte_b
      `)
      .eq("id", contract_id)
      .maybeSingle();

    if (contratoError || !contrato) {
      throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
    }

    if (!(await isAuthorizedForOrg(req, supabase, contrato.organization_id))) {
      return new Response(JSON.stringify({ error: "Forbidden: sem acesso a este contrato" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from("contract_extractions")
        .select("extraction_data")
        .eq("contrato_id", contract_id)
        .eq("source", "client_analysis")
        .maybeSingle();
      if (existing?.extraction_data) {
        return new Response(JSON.stringify({ success: true, data: existing.extraction_data, cached: true }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `Você é um analista jurídico que explica contratos a gestores não-advogados.
Responda APENAS com JSON válido, sem markdown, nesta forma exata:
{
  "risco": {
    "grau": "A|B|C|D|F",
    "resumo": "1-2 frases sobre o nível de risco global do contrato para o cliente",
    "fatores": [
      { "clausula": "nome curto (ex: Renovação automática, RGPD, Exclusividade)", "nivel": "alto|medio|baixo", "nota": "porque importa, 1 frase" }
    ]
  },
  "obrigacoes": [
    { "descricao": "obrigação em linguagem simples", "responsavel": "quem (parte A/B/cliente)", "prazo": "data ou condição, ou null" }
  ]
}
Regras:
- Grau A = risco muito baixo; F = risco muito elevado. Baseie-se nas cláusulas e dados fornecidos.
- 3 a 6 fatores de risco; priorize renovação automática, prazos curtos de aviso, RGPD/transferências internacionais, exclusividade, não-concorrência, confidencialidade.
- 3 a 8 obrigações-chave. Não invente dados que não constem do contrato.
- Português europeu, claro e conciso.`;

    const userMessage = `Analise este contrato e produza o radar de obrigações e a avaliação de risco para o CLIENTE:

${JSON.stringify(contrato, null, 2)}`;

    const data = await callClaude(ANTHROPIC_API_KEY, CLAUDE_SONNET, systemPrompt, userMessage);
    let analysis: Record<string, unknown>;
    try {
      analysis = parseJSON(data);
    } catch {
      throw new Error("Erro ao processar a análise da IA");
    }

    const { error: cacheError } = await supabase.from("contract_extractions").upsert(
      {
        contrato_id: contract_id,
        source: "client_analysis",
        status: "success",
        extraction_data: analysis as Record<string, unknown>,
        job_started_at: new Date().toISOString(),
        job_completed_at: new Date().toISOString(),
      },
      { onConflict: "contrato_id,source" },
    );
    if (cacheError) {
      // Não bloquear a resposta, mas sem cache cada abertura repete a chamada paga
      console.error("[analyze-contract-client] Cache upsert failed:", cacheError.message);
    }

    return new Response(JSON.stringify({ success: true, data: analysis, cached: false }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-contract-client] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
