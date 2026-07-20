import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isAuthorizedForOrg } from "../_shared/orgAuth.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

/**
 * portal-assistant
 *
 * Assistente conversacional do Portal do Cliente (S3 do blueprint Hub CCA).
 * Responde a perguntas em linguagem natural APENAS sobre o universo que o
 * cliente contratou à CCA: a carteira de contratos, os assuntos publicados e
 * os documentos do arquivo. Perguntas fora desse universo recebem sempre o
 * redirecionamento "não contratou a CCA para este serviço — contacte-nos".
 *
 * Reativado com dois reforços face à versão original:
 *  - o universo contratado inclui os assuntos PUBLICADOS (hub F2), para o
 *    âmbito refletir o serviço efetivamente contratado, não só contratos;
 *  - gate do lado do servidor pela consola de gestão
 *    (hub_portal_config.funcionalidades.assistente) — desligar na consola
 *    desativa o assistente mesmo para chamadas diretas à API.
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

    // Gate da consola: funcionalidade "assistente" desligada → 403 também na
    // camada de servidor (nunca só na UI).
    const { data: cfg } = await supabase
      .from("hub_portal_config")
      .select("funcionalidades")
      .eq("organization_id", organization_id)
      .maybeSingle();
    const funcionalidades = (cfg?.funcionalidades ?? {}) as Record<string, boolean>;
    if (funcionalidades.assistente === false) {
      return new Response(
        JSON.stringify({ error: "Assistente desativado para esta organização" }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // ── Universo contratado ─────────────────────────────────────────
    // 1) Carteira de contratos (campos relevantes, não arquivados)
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

    // 2) Assuntos publicados (serviço contratado; só o universo publicado —
    //    nunca rascunhos internos)
    const { data: assuntos } = await supabase
      .from("assuntos")
      .select("titulo, tipo, estado, referencia, status_cliente, descricao")
      .eq("organization_id", organization_id)
      .eq("publicado", true)
      .limit(60);

    const hoje = new Date().toISOString().slice(0, 10);
    const carteira = (contratos ?? []).map((c, i) => ({ ref: i + 1, ...c }));

    const lastUserMessage =
      [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";
    const model = routeModel(lastUserMessage);

    // 3) Documentos disponíveis no arquivo (nomes) — para o assistente saber
    //    o que existe e nunca negar acesso ao que consta do arquivo.
    const { data: docList } = await supabase
      .from("client_document_text")
      .select("name, folder_path")
      .eq("organization_id", organization_id)
      .order("extracted_at", { ascending: false })
      .limit(100);
    const availableDocs = (docList ?? []) as Array<{ name: string; folder_path: string | null }>;

    // 4) Excertos relevantes: full-text search + correspondência por nome
    let docExcerpts: Array<{ name: string; folder: string | null; excerpt: string }> = [];
    if (lastUserMessage.trim()) {
      const { data: hits } = await supabase.rpc("fn_search_client_documents", {
        p_org: organization_id,
        p_query: lastUserMessage,
        p_limit: 5,
      });
      docExcerpts = (hits ?? []).map((h: { name: string; folder_path: string | null; excerpt: string }) => ({
        name: h.name,
        folder: h.folder_path,
        excerpt: h.excerpt,
      }));

      const words = Array.from(
        new Set(
          lastUserMessage
            .split(/[^\p{L}\p{N}]+/u)
            .map((w: string) => w.trim())
            .filter((w: string) => w.length >= 4),
        ),
      ).slice(0, 8);
      if (words.length > 0) {
        const orFilter = words.map((w) => `name.ilike.%${w}%`).join(",");
        const { data: byName } = await supabase
          .from("client_document_text")
          .select("name, folder_path, content")
          .eq("organization_id", organization_id)
          .or(orFilter)
          .limit(3);
        for (const d of (byName ?? []) as Array<{ name: string; folder_path: string | null; content: string }>) {
          if (!docExcerpts.some((e) => e.name === d.name)) {
            docExcerpts.push({
              name: d.name,
              folder: d.folder_path,
              excerpt: (d.content ?? "").slice(0, 3000),
            });
          }
        }
      }
    }

    const systemPrompt = `Você é o assistente do Portal do Cliente da CCA — Sociedade de Advogados.
Ajuda o cliente a compreender e a gerir o que contratou à CCA: a SUA carteira de
contratos, os SEUS assuntos em curso e os SEUS documentos.
Responda sempre em português europeu, de forma clara, acessível e concisa.

Regras:
- ÂMBITO ESTRITO: só responde com base no universo contratado do cliente (os
  contratos, assuntos e documentos listados abaixo). NÃO é um assistente
  jurídico geral.
- Se a pergunta for sobre um tema/serviço que NÃO consta desse universo (ou
  seja, um serviço que o cliente não contratou à CCA), NÃO forneça informação
  jurídica genérica nem explicações sobre o tema. Responda EXATAMENTE com esta
  mensagem (adaptando apenas o nome do tema):
  "Não contratou a CCA para este serviço. Se desejar apoio nesta matéria, basta
  contactar-nos — pode abrir um pedido no menu «Pedidos à CCA» e a nossa equipa
  responder-lhe-á em breve."
- Quando o tema EXISTE no universo contratado: TEM acesso ao conteúdo dos
  documentos (ver "DOCUMENTOS DISPONÍVEIS") e à carteira; pode ler, resumir,
  comparar e citar. Nunca diga que não tem acesso a um documento que conste do
  arquivo — se faltar o excerto, peça a pergunta concreta sobre esse documento.
- Não confunda nomes próprios: por exemplo, "Golden Visa" (vistos por
  investimento) é um tema diferente de uma empresa com nome parecido que conste
  do arquivo. Se o tema perguntado não for um serviço contratado, redirecione
  conforme acima.
- Baseie-se exclusivamente nos dados fornecidos abaixo; não invente factos.
- Ao referir contratos, identifique-os pelo título (e referência interna quando útil).
- Destaque prazos próximos, renovações e riscos (RGPD, exclusividade, etc.) quando relevante.
- Hoje é ${hoje}.

ASSUNTOS CONTRATADOS EM CURSO (${(assuntos ?? []).length}):
${(assuntos ?? []).length > 0 ? JSON.stringify(assuntos, null, 2) : "(nenhum assunto publicado)"}

DOCUMENTOS DISPONÍVEIS NO ARQUIVO DO CLIENTE (${availableDocs.length}):
${availableDocs.length > 0 ? availableDocs.map((d) => `- ${d.name}${d.folder ? ` (${d.folder})` : ""}`).join("\n") : "(nenhum documento indexado ainda)"}

CARTEIRA DE CONTRATOS DO CLIENTE (${carteira.length}):
${JSON.stringify(carteira, null, 2)}
${
  docExcerpts.length > 0
    ? `\nEXCERTOS RELEVANTES DOS DOCUMENTOS DO CLIENTE (cite o nome do documento quando os usar):\n${docExcerpts
        .map((d, i) => `[Doc ${i + 1}] ${d.name}${d.folder ? ` (${d.folder})` : ""}:\n${d.excerpt}`)
        .join("\n\n")}`
    : ""
}`;

    const response = await anthropicMessage({
      apiKey: ANTHROPIC_API_KEY,
      model,
      system: systemPrompt,
      messages,
      maxTokens: 1200,
    });

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
