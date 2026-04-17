import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * contract-chat
 *
 * Chat inteligente sobre um contrato específico.
 * Routing automático:
 *   - Perguntas simples → Claude Haiku 4.5 ($0,0035/pergunta)
 *   - Perguntas jurídicas complexas → Claude Sonnet 4.6 ($0,033/pergunta)
 */

const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";
const CLAUDE_SONNET = "claude-sonnet-4-6";

// Palavras-chave que escalam para Sonnet
const COMPLEX_LEGAL_KEYWORDS = [
  "cláusula", "responsabilidade", "rescisão", "incumprimento", "indemnização",
  "confidencialidade", "propriedade intelectual", "penalização", "nulidade",
  "arbitragem", "litigância", "cessão", "subrogação", "garantia", "caução",
  "rgpd", "proteção de dados", "dpa", "transferência internacional",
];

import { corsHeaders } from "../_shared/cors.ts";
import { rateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

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

  const rl = rateLimit("ai:contract-chat", getRateLimitKey(req), { windowMs: 5 * 60_000, max: 60 });
  if (!rl.allowed) return rateLimitResponse(req, rl);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { contract_id, messages, contract_context } = await req.json();

    if (!contract_id || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "contract_id e messages são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter dados do contrato se não foram passados no contexto
    let contractInfo = contract_context;
    if (!contractInfo) {
      const { data: contrato } = await supabase
        .from("contratos")
        .select(`
          titulo_contrato, tipo_contrato, objeto_resumido,
          parte_a_nome_legal, parte_b_nome_legal,
          data_inicio_vigencia, data_termo, tipo_renovacao,
          aviso_denuncia_dias, valor_total_estimado, moeda,
          tratamento_dados_pessoais, existe_dpa_anexo_rgpd,
          flag_confidencialidade, flag_exclusividade, flag_nao_concorrencia,
          lei_aplicavel, foro_competente, obrigacoes_parte_a, obrigacoes_parte_b,
          clausulas_importantes
        `)
        .eq("id", contract_id)
        .maybeSingle();

      contractInfo = contrato;
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const model = routeModel(lastUserMessage);

    const systemPrompt = `Você é um assistente jurídico especializado a ajudar a compreender contratos portugueses.
Responda sempre em português europeu, de forma clara e acessível.
Seja preciso e refira-se sempre ao contrato em análise.
Quando existirem riscos ou pontos de atenção, destaque-os claramente.
Não invente informação que não esteja no contrato — se não souber, diga isso.

CONTRATO EM ANÁLISE:
${JSON.stringify(contractInfo, null, 2)}

Responda de forma concisa (máx 3 parágrafos salvo pedido explícito de detalhe).`;

    console.log(`[contract-chat] Model: ${model}, contract: ${contract_id}`);

    const response = await callClaude(ANTHROPIC_API_KEY, model, systemPrompt, messages, 1024);

    return new Response(
      JSON.stringify({ success: true, response, model_used: model }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[contract-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
