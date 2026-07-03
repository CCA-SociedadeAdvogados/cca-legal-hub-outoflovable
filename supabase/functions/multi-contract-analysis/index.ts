import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * multi-contract-analysis
 *
 * Análise transversal de múltiplos contratos de um cliente.
 * Permite ao advogado CCA fazer perguntas sobre o portefólio completo.
 * Modelo: Claude Sonnet 4.6 (contexto largo 1M tokens)
 */

const CLAUDE_SONNET = "claude-sonnet-4-6";

import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

async function callClaude(apiKey: string, system: string, user: string, maxTokens = 2048): Promise<string> {
  return anthropicMessage({ apiKey, model: CLAUDE_SONNET, system, user, maxTokens });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { organization_id, question } = await req.json();

    if (!organization_id || !question) {
      return new Response(
        JSON.stringify({ error: "organization_id e question são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autorização: o chamador tem de pertencer à organização
    // (ou ser CCA/admin/service role). Impede fuga cross-tenant via service role.
    if (!(await isAuthorizedForOrg(req, supabase, organization_id))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: sem acesso a esta organização" }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Obter todos os contratos activos da organização (sumários para controlar custo)
    const { data: contratos, error } = await supabase
      .from("contratos")
      .select(`
        id, id_interno, titulo_contrato, tipo_contrato, objeto_resumido,
        parte_b_nome_legal, estado_contrato, data_inicio_vigencia, data_termo,
        tipo_renovacao, aviso_denuncia_dias, valor_total_estimado, moeda,
        tratamento_dados_pessoais, flag_confidencialidade, flag_exclusividade,
        flag_nao_concorrencia, departamento_responsavel
      `)
      .eq("organization_id", organization_id)
      .not("estado_contrato", "in", "(denunciado,rescindido)")
      .order("estado_contrato", { ascending: true });

    if (error) throw new Error(`Erro ao obter contratos: ${error.message}`);

    if (!contratos || contratos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          answer: "Não existem contratos activos para analisar nesta organização.",
          referenced_contracts: [],
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `Você é um advogado sénior da CCA - Sociedade de Advogados a analisar o portefólio de contratos de um cliente.
Responda em português europeu de forma precisa e profissional.
Quando referenciar contratos específicos, use o id_interno (ex: CCA-2024-001).
Seja directo e concreto. Se não houver dados suficientes para responder, diga-o.`;

    const userMessage = `PORTEFÓLIO DE CONTRATOS (${contratos.length} contratos):

${contratos.map((c, i) => `[${i + 1}] ${c.id_interno} — ${c.titulo_contrato}
  Tipo: ${c.tipo_contrato} | Estado: ${c.estado_contrato}
  Contraparte: ${c.parte_b_nome_legal}
  Período: ${c.data_inicio_vigencia ?? "?"} → ${c.data_termo ?? "indeterminado"}
  Valor: ${c.valor_total_estimado ? `${c.valor_total_estimado} ${c.moeda}` : "N/A"}
  Renovação: ${c.tipo_renovacao ?? "N/A"} | Aviso: ${c.aviso_denuncia_dias ?? "N/A"} dias
  Dados pessoais: ${c.tratamento_dados_pessoais ? "Sim" : "Não"}
  Exclusividade: ${c.flag_exclusividade ? "Sim" : "Não"} | Não-concorrência: ${c.flag_nao_concorrencia ? "Sim" : "Não"}
  Departamento: ${c.departamento_responsavel ?? "N/A"}
`).join("\n")}

PERGUNTA DO ADVOGADO: ${question}

Responda directamente à pergunta. Se identificar contratos específicos relevantes, liste os seus id_interno.`;

    console.log(`[multi-contract-analysis] Analyzing ${contratos.length} contracts for org ${organization_id}`);
    const answer = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userMessage, 2048);

    // Identificar contratos referenciados na resposta
    const referencedContracts = contratos
      .filter((c) => c.id_interno && answer.includes(c.id_interno))
      .map((c) => ({ id: c.id, id_interno: c.id_interno, titulo: c.titulo_contrato }));

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        referenced_contracts: referencedContracts,
        contracts_analyzed: contratos.length,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[multi-contract-analysis] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
