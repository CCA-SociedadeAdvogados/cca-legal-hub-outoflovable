import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";

/**
 * portal-assistant
 *
 * Assistente conversacional do Portal do Cliente. Responde a perguntas em
 * linguagem natural sobre a carteira de contratos do cliente (o "assunto que
 * contratou a CCA"), fundamentado nos dados reais da organização.
 *
 * Fase 1: grounding nos contratos (estruturados). Fase 2 (futura): RAG sobre o
 * conteúdo dos documentos das pastas SharePoint.
 *
 * Autorização: o chamador tem de pertencer à organização (ou ser CCA/admin).
 */

const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";
const CLAUDE_SONNET = "claude-sonnet-4-6";

const COMPLEX_LEGAL_KEYWORDS = [
  "cláusula", "responsabilidade", "rescisão", "incumprimento", "indemnização",
  "confidencialidade", "propriedade intelectual", "penalização", "nulidade",
  "arbitragem", "litigância", "cessão", "garantia", "caução",
  "rgpd", "proteção de dados", "dpa", "transferência internacional", "risco",
];

function routeModel(question: string): string {
  const lower = question.toLowerCase();
  return COMPLEX_LEGAL_KEYWORDS.some((kw) => lower.includes(kw)) ? CLAUDE_SONNET : CLAUDE_HAIKU;
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 1024,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Claude retornou resposta vazia");
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { organization_id, messages } = await req.json();
    if (!organization_id || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "organization_id e messages são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Autorização: só membros da org (ou CCA/admin/service role)
    if (!(await isAuthorizedForOrg(req, supabase, organization_id))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: sem acesso a esta organização" }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Reunir a carteira de contratos do cliente (campos relevantes, não arquivados)
    const { data: contratos, error: contratosErr } = await supabase
      .from("contratos")
      .select(`
        id_interno, titulo_contrato, tipo_contrato, estado_contrato, objeto_resumido,
        parte_a_nome_legal, parte_b_nome_legal,
        data_inicio_vigencia, data_termo, data_limite_decisao_renovacao,
        aviso_previo_nao_renovacao_dias, tipo_renovacao,
        valor_total_estimado, moeda,
        tratamento_dados_pessoais, existe_dpa_anexo_rgpd, transferencia_internacional,
        flag_confidencialidade, flag_exclusividade, flag_nao_concorrencia,
        obrigacoes_parte_a, obrigacoes_parte_b
      `)
      .eq("organization_id", organization_id)
      .eq("arquivado", false)
      .order("data_termo", { ascending: true })
      .limit(80);

    if (contratosErr) throw contratosErr;

    const hoje = new Date().toISOString().slice(0, 10);
    const carteira = (contratos ?? []).map((c, i) => ({ ref: i + 1, ...c }));

    const lastUserMessage =
      [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";
    const model = routeModel(lastUserMessage);

    const systemPrompt = `Você é o assistente do Portal do Cliente da CCA — Sociedade de Advogados.
Ajuda o cliente a compreender e a gerir a SUA carteira de contratos com a CCA.
Responda sempre em português europeu, de forma clara, acessível e concisa.

Regras:
- Baseie-se EXCLUSIVAMENTE nos dados fornecidos abaixo. Não invente nada.
- Se a informação não constar dos dados, diga que não tem essa informação no portal
  e sugira contactar a equipa da CCA.
- Ao referir contratos, identifique-os pelo título (e referência interna quando útil).
- Destaque prazos próximos, renovações e riscos (RGPD, exclusividade, etc.) quando relevante.
- Hoje é ${hoje}.

CARTEIRA DE CONTRATOS DO CLIENTE (${carteira.length}):
${JSON.stringify(carteira, null, 2)}`;

    const response = await callClaude(ANTHROPIC_API_KEY, model, systemPrompt, messages, 1200);

    return new Response(
      JSON.stringify({ success: true, response, model_used: model, contracts_count: carteira.length }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[portal-assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
