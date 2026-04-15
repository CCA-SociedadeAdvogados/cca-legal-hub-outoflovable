import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * generate-contract
 *
 * Gera um rascunho de contrato em português jurídico a partir de um template e campos.
 * Modelo: Claude Sonnet 4.6 (redacção jurídica de qualidade)
 */

const CLAUDE_SONNET = "claude-sonnet-4-6";

const TEMPLATE_PROMPTS: Record<string, string> = {
  nda: "Acordo de Confidencialidade (NDA) bilateral, com obrigações recíprocas, prazo de confidencialidade de 3 anos após vigência, exclusões standard (informação pública, desenvolvimento independente), jurisdição portuguesa.",
  prestacao_servicos: "Contrato de Prestação de Serviços com descrição detalhada de serviços, SLAs, propriedade intelectual dos resultados, responsabilidade limitada, resolução por incumprimento, lei portuguesa.",
  saas: "Contrato SaaS com licença de uso do software, níveis de serviço (SLA), proteção de dados (RGPD), limitação de responsabilidade, continuidade de dados em caso de rescisão, lei portuguesa.",
  fornecimento: "Contrato de Fornecimento de Bens com especificações, prazos de entrega, garantias, condições de pagamento, penalidades por atraso, lei portuguesa.",
  trabalho: "Contrato de Trabalho nos termos do Código do Trabalho português, com funções, remuneração, horário, período experimental, cláusula de não concorrência opcional.",
  consultoria: "Contrato de Consultoria com âmbito dos serviços de consultoria, entregáveis, honorários, propriedade intelectual, confidencialidade, lei portuguesa.",
  parceria: "Acordo de Parceria Comercial com definição de responsabilidades, partilha de receitas/custos, marca, exclusividade opcional, saída da parceria, lei portuguesa.",
  arrendamento: "Contrato de Arrendamento para fins não habitacionais (NRAU), prazo, renda, obras, seguros, regime legal português.",
  licenciamento: "Contrato de Licenciamento de propriedade intelectual, âmbito da licença, exclusividade, royalties, território, duração, lei portuguesa.",
};

import { corsHeaders } from "../_shared/cors.ts";

async function callClaude(apiKey: string, system: string, user: string, maxTokens = 8000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_SONNET,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
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

    const { template_type, fields } = await req.json();

    if (!template_type || !fields) {
      return new Response(
        JSON.stringify({ error: "template_type e fields são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const templateContext = TEMPLATE_PROMPTS[template_type] ||
      "Contrato comercial genérico nos termos da lei portuguesa.";

    const systemPrompt = `Você é um advogado sénior especializado em redacção de contratos portugueses.
Redija um contrato profissional e juridicamente correcto em português europeu formal.
O contrato deve ser completo, com todas as cláusulas necessárias para este tipo de acordo.
Inclua: identificação das partes, objecto, obrigações, condições financeiras, duração, renovação, rescisão, resolução de conflitos, lei aplicável.
Use numeração de artigos (Artigo 1.º, Artigo 2.º, etc.) e cláusulas (n.º 1, n.º 2, etc.).
Não use placeholders — use os dados fornecidos. Para campos em falta, use linguagem flexível mas juridicamente adequada.`;

    const userMessage = `Redija um contrato do tipo: ${templateContext}

DADOS DAS PARTES E CONDIÇÕES:
${JSON.stringify(fields, null, 2)}

Gere o contrato completo em português europeu formal, pronto para revisão e assinatura.`;

    console.log(`[generate-contract] Generating ${template_type} contract`);
    const contractText = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userMessage, 8000);

    return new Response(
      JSON.stringify({ success: true, contract_text: contractText, template_type }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[generate-contract] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
