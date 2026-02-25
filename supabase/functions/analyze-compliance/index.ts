import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = [
  { model: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { model: "openai/gpt-5-mini", name: "GPT-5 Mini" },
  { model: "google/gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { model: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
];

async function callAIWithFallback(
  apiKey: string,
  messages: Array<{ role: string; content: any }>,
  functionName: string
): Promise<{ content: string; model: string }> {
  let lastError: Error | null = null;

  for (const { model, name } of AI_MODELS) {
    try {
      console.log(`[${functionName}] Trying ${name} (${model})...`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages }),
      });

      if (response.status === 429) {
        console.warn(`[${functionName}] ${name} rate limited, trying next model...`);
        lastError = new Error(`${name} rate limited`);
        continue;
      }

      if (response.status === 402) {
        console.warn(`[${functionName}] ${name} credits exhausted, trying next model...`);
        lastError = new Error(`${name} credits exhausted`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[${functionName}] ${name} failed (${response.status}): ${errorText}`);
        lastError = new Error(`${name} error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn(`[${functionName}] ${name} returned empty content, trying next...`);
        lastError = new Error(`${name} returned empty content`);
        continue;
      }

      console.log(`[${functionName}] Success with ${name}`);
      return { content, model: name };
    } catch (error: any) {
      console.warn(`[${functionName}] ${name} exception:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error("Todos os modelos de IA falharam. Tente novamente mais tarde.");
}

// Input validation constants
const MAX_TEXT_CONTENT_LENGTH = 500000; // 500KB of text
const MAX_ARRAY_LENGTH = 100;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TYPES = ["parse_contract", "analyze_event_impact", "compliance_check", "contract_compliance_check"] as const;
const VALID_TIPO_CONTRATO = ["nda", "prestacao_servicos", "fornecimento", "saas", "arrendamento", "trabalho", "licenciamento", "parceria", "consultoria", "outro"] as const;

// Validation helpers
function validateUUID(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

function validateStringArray(arr: unknown, maxLength: number = MAX_ARRAY_LENGTH): boolean {
  if (!Array.isArray(arr)) return false;
  if (arr.length > maxLength) return false;
  return arr.every(item => typeof item === "string" && item.length < 255);
}

function validateTextContent(text: unknown): { valid: boolean; error?: string } {
  if (text === undefined || text === null) {
    return { valid: true }; // Optional field
  }
  if (typeof text !== "string") {
    return { valid: false, error: "textContent must be a string" };
  }
  if (text.length > MAX_TEXT_CONTENT_LENGTH) {
    return { valid: false, error: `textContent exceeds maximum length of ${MAX_TEXT_CONTENT_LENGTH} characters` };
  }
  return { valid: true };
}

interface AnalysisRequest {
  type: typeof VALID_TYPES[number];
  data: {
    textContent?: string;
    eventoId?: string;
    contratoIds?: string[];
    tipoContrato?: string;
    contratoId?: string;
    areasDireitoAplicaveis?: string[];
  };
  model?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof body !== "object" || body === null) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, data, model: requestedModel } = body as Record<string, unknown>;

    // Validate type
    if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing analysis type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate data object
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid data object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisData = data as Record<string, unknown>;

    // Validate textContent if present
    const textValidation = validateTextContent(analysisData.textContent);
    if (!textValidation.valid) {
      return new Response(
        JSON.stringify({ error: textValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate eventoId if present
    if (analysisData.eventoId !== undefined && !validateUUID(analysisData.eventoId)) {
      return new Response(
        JSON.stringify({ error: "Invalid eventoId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate contratoId if present
    if (analysisData.contratoId !== undefined && !validateUUID(analysisData.contratoId)) {
      return new Response(
        JSON.stringify({ error: "Invalid contratoId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate contratoIds array if present
    if (analysisData.contratoIds !== undefined) {
      if (!Array.isArray(analysisData.contratoIds)) {
        return new Response(
          JSON.stringify({ error: "contratoIds must be an array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (analysisData.contratoIds.length > MAX_ARRAY_LENGTH) {
        return new Response(
          JSON.stringify({ error: `contratoIds exceeds maximum length of ${MAX_ARRAY_LENGTH}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!analysisData.contratoIds.every(validateUUID)) {
        return new Response(
          JSON.stringify({ error: "Invalid UUID in contratoIds" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate tipoContrato if present
    if (analysisData.tipoContrato !== undefined) {
      if (typeof analysisData.tipoContrato !== "string") {
        return new Response(
          JSON.stringify({ error: "tipoContrato must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!VALID_TIPO_CONTRATO.includes(analysisData.tipoContrato as typeof VALID_TIPO_CONTRATO[number])) {
        return new Response(
          JSON.stringify({ error: "Invalid tipoContrato value" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate areasDireitoAplicaveis if present
    if (analysisData.areasDireitoAplicaveis !== undefined) {
      if (!validateStringArray(analysisData.areasDireitoAplicaveis, 20)) {
        return new Response(
          JSON.stringify({ error: "Invalid areasDireitoAplicaveis format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Cast to typed request after validation
    const request: AnalysisRequest = {
      type: type as AnalysisRequest["type"],
      data: {
        textContent: analysisData.textContent as string | undefined,
        eventoId: analysisData.eventoId as string | undefined,
        contratoIds: analysisData.contratoIds as string[] | undefined,
        tipoContrato: analysisData.tipoContrato as string | undefined,
        contratoId: analysisData.contratoId as string | undefined,
        areasDireitoAplicaveis: analysisData.areasDireitoAplicaveis as string[] | undefined,
      },
      model: typeof requestedModel === "string" ? requestedModel : undefined,
    };

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let systemPrompt = "";
    let userPrompt = "";

    if (request.type === "parse_contract") {
      if (!request.data.textContent) {
        return new Response(
          JSON.stringify({ error: "textContent is required for parse_contract" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = getContractParsingPrompt();
      userPrompt = `Analise o seguinte contrato e extraia as informações:\n\n${request.data.textContent}`;
    } else if (request.type === "analyze_event_impact") {
      if (!request.data.eventoId) {
        return new Response(
          JSON.stringify({ error: "eventoId is required for analyze_event_impact" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: evento, error: eventoError } = await supabase
        .from("eventos_legislativos")
        .select("*")
        .eq("id", request.data.eventoId)
        .single();

      if (eventoError || !evento) {
        throw new Error("Evento legislativo não encontrado");
      }

      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          id_interno,
          titulo_contrato,
          tipo_contrato,
          objeto_resumido,
          parte_b_nome_legal,
          departamento_responsavel,
          tratamento_dados_pessoais,
          flag_confidencialidade,
          data_termo,
          valor_total_estimado
        `)
        .eq("estado_contrato", "activo");

      if (contratosError) {
        throw new Error("Erro ao buscar contratos");
      }

      systemPrompt = getEventImpactAnalysisPrompt();
      userPrompt = buildEventImpactPrompt(evento, contratos || []);
    } else if (request.type === "compliance_check") {
      if (!request.data.eventoId) {
        return new Response(
          JSON.stringify({ error: "eventoId is required for compliance_check" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: evento } = await supabase
        .from("eventos_legislativos")
        .select("*")
        .eq("id", request.data.eventoId)
        .single();

      const { data: contratos } = await supabase
        .from("contratos")
        .select("*")
        .in("id", request.data.contratoIds || []);

      systemPrompt = getComplianceCheckPrompt();
      userPrompt = buildComplianceCheckPrompt(evento, contratos || []);
    } else if (request.type === "contract_compliance_check") {
      const { textContent, tipoContrato, areasDireitoAplicaveis } = request.data;

      let eventosQuery = supabase
        .from("eventos_legislativos")
        .select("*")
        .eq("estado", "activo");

      if (areasDireitoAplicaveis && areasDireitoAplicaveis.length > 0) {
        const dbAreas = areasDireitoAplicaveis.map(area => {
          if (area === "ciberseguranca") return "outro";
          return area;
        });
        eventosQuery = eventosQuery.in("area_direito", dbAreas);
      }

      const { data: eventos, error: eventosError } = await eventosQuery;

      if (eventosError) {
        console.error("Error fetching eventos:", eventosError);
        throw new Error("Erro ao buscar eventos legislativos");
      }

      console.log(`Found ${eventos?.length || 0} legislative events for areas: ${areasDireitoAplicaveis?.join(", ") || "all"}`);

      if (!eventos || eventos.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              resumo_contrato: "Contrato analisado",
              eventos_verificados: [],
              sumario_geral: { total_eventos: 0, conformes: 0, parcialmente_conformes: 0, nao_conformes: 0, nao_aplicaveis: 0 },
              recomendacoes_gerais: ["Não foram encontrados eventos legislativos para as áreas classificadas. Adicione eventos legislativos relevantes na secção de Eventos."],
              proximos_passos: ["Adicionar eventos legislativos relevantes para as áreas de direito aplicáveis"],
              confianca: 100
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = getContractComplianceCheckPrompt();
      userPrompt = buildContractCompliancePrompt(textContent || "", tipoContrato || "outro", eventos || [], areasDireitoAplicaveis || []);
    } else {
      throw new Error("Tipo de análise não suportado");
    }

    console.log(`Processing ${request.type} analysis...`);

    const { content } = await callAIWithFallback(
      OPENROUTER_API_KEY!,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      "analyze-compliance"
    );

    let parsedData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response");
      throw new Error("Não foi possível processar a resposta da IA");
    }

    console.log(`${request.type} analysis completed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in analyze-compliance function:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "Erro ao processar análise" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getContractParsingPrompt(): string {
  return `Você é um assistente jurídico especializado em análise de contratos portugueses. 
Analise o texto do contrato fornecido e extraia as seguintes informações de forma estruturada.
Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura exata:
{
  "titulo_contrato": "string - título ou tipo do contrato",
  "tipo_contrato": "string - um de: nda, prestacao_servicos, fornecimento, saas, arrendamento, trabalho, licenciamento, parceria, consultoria, outro",
  "objeto_resumido": "string - resumo do objeto do contrato (máx 500 caracteres)",
  "parte_a_nome_legal": "string - nome legal da primeira parte",
  "parte_a_nif": "string ou null - NIF/NIPC da primeira parte",
  "parte_b_nome_legal": "string - nome legal da segunda parte",
  "parte_b_nif": "string ou null - NIF/NIPC da segunda parte",
  "data_assinatura": "string ou null - data de assinatura no formato YYYY-MM-DD",
  "data_inicio_vigencia": "string ou null - data início de vigência no formato YYYY-MM-DD",
  "data_termo": "string ou null - data de termo/fim no formato YYYY-MM-DD",
  "valor_total_estimado": "number ou null - valor total em euros",
  "clausulas_importantes": ["array de strings - cláusulas ou pontos importantes identificados"],
  "riscos_identificados": ["array de strings - potenciais riscos ou pontos de atenção"],
  "confianca": "number - nível de confiança da extração de 0 a 100"
}`;
}

function getEventImpactAnalysisPrompt(): string {
  return `Você é um especialista em conformidade legal e regulamentar portuguesa.
Sua tarefa é analisar um evento legislativo/regulamentar e determinar quais contratos podem ser impactados.

Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura:
{
  "resumo_evento": "string - resumo do evento e suas principais implicações",
  "areas_afetadas": ["array de strings - áreas jurídicas/operacionais afetadas"],
  "contratos_impactados": [
    {
      "contrato_id": "string - ID do contrato",
      "contrato_titulo": "string - título do contrato",
      "nivel_risco": "string - baixo, medio ou alto",
      "motivo_impacto": "string - porque este contrato é impactado",
      "acoes_recomendadas": ["array de strings - ações recomendadas"],
      "prazo_sugerido": "string - prazo sugerido para ação (ex: 30 dias, 90 dias, imediato)",
      "clausulas_a_rever": ["array de strings - cláusulas específicas que precisam revisão"]
    }
  ],
  "contratos_nao_impactados": ["array de IDs de contratos não impactados"],
  "recomendacoes_gerais": ["array de strings - recomendações gerais de conformidade"],
  "confianca": "number - nível de confiança da análise de 0 a 100"
}`;
}

function getComplianceCheckPrompt(): string {
  return `Você é um especialista em conformidade legal portuguesa.
Analise os contratos fornecidos em relação ao evento legislativo e forneça um relatório detalhado de conformidade.

Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura:
{
  "analise_detalhada": [
    {
      "contrato_id": "string",
      "contrato_titulo": "string",
      "status_conformidade": "string - conforme, parcialmente_conforme, nao_conforme",
      "pontos_conformes": ["array de strings"],
      "pontos_nao_conformes": ["array de strings"],
      "acoes_corretivas": [
        {
          "acao": "string - descrição da ação",
          "prioridade": "string - alta, media, baixa",
          "prazo": "string - prazo sugerido",
          "responsavel_sugerido": "string - departamento ou função responsável"
        }
      ],
      "texto_adenda_sugerido": "string ou null - texto sugerido para adenda se necessário"
    }
  ],
  "sumario_executivo": "string - resumo executivo da análise",
  "proximos_passos": ["array de strings - próximos passos recomendados"]
}`;
}

function getContractComplianceCheckPrompt(): string {
  return `Você é um especialista em conformidade legal e regulamentar portuguesa.
Sua tarefa é analisar um contrato e verificar a sua conformidade com TODOS os eventos legislativos fornecidos.

Para cada evento legislativo, você deve:
1. Determinar se é aplicável ao tipo de contrato
2. Identificar GAPS de conformidade (pontos onde o contrato não cumpre a legislação)
3. Fornecer recomendações específicas para corrigir os gaps
4. Identificar cláusulas relevantes que precisam de atenção

Seja rigoroso na identificação de gaps. Mesmo pequenas omissões ou formulações inadequadas devem ser reportadas.

Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura:
{
  "resumo_contrato": "string - breve resumo do contrato analisado",
  "eventos_verificados": [
    {
      "evento_id": "string - ID do evento legislativo",
      "evento_titulo": "string - título do evento",
      "area_direito": "string - área de direito",
      "status_conformidade": "string - conforme, parcialmente_conforme, nao_conforme, ou nao_aplicavel",
      "gaps_identificados": ["array de strings - gaps de conformidade identificados"],
      "recomendacoes": ["array de strings - recomendações para corrigir gaps"],
      "clausulas_relevantes": ["array de strings - cláusulas do contrato relevantes para esta legislação"],
      "prioridade": "string - alta, media, ou baixa (baseado na gravidade dos gaps)"
    }
  ],
  "sumario_geral": {
    "total_eventos": "number - total de eventos verificados",
    "conformes": "number - quantidade de eventos conformes",
    "parcialmente_conformes": "number - quantidade parcialmente conformes",
    "nao_conformes": "number - quantidade não conformes",
    "nao_aplicaveis": "number - quantidade não aplicáveis"
  },
  "recomendacoes_gerais": ["array de strings - recomendações gerais para o contrato"],
  "proximos_passos": ["array de strings - próximos passos recomendados ordenados por prioridade"],
  "confianca": "number - nível de confiança da análise de 0 a 100"
}`;
}

function buildEventImpactPrompt(evento: Record<string, unknown>, contratos: Record<string, unknown>[]): string {
  const eventoInfo = `
EVENTO LEGISLATIVO:
- Título: ${evento.titulo}
- Área de Direito: ${evento.area_direito}
- Jurisdição: ${evento.jurisdicao}
- Data Publicação: ${evento.data_publicacao || "N/A"}
- Data Entrada em Vigor: ${evento.data_entrada_vigor || "N/A"}
- Referência Legal: ${evento.referencia_legal || "N/A"}
- Descrição: ${evento.descricao_resumo || "N/A"}
- Tags: ${Array.isArray(evento.tags) ? evento.tags.join(", ") : "N/A"}
`;

  const contratosInfo = contratos.map((c, i) => `
CONTRATO ${i + 1}:
- ID: ${c.id}
- ID Interno: ${c.id_interno}
- Título: ${c.titulo_contrato}
- Tipo: ${c.tipo_contrato}
- Contraparte: ${c.parte_b_nome_legal}
- Departamento: ${c.departamento_responsavel}
- Objeto: ${c.objeto_resumido || "N/A"}
- Data Termo: ${c.data_termo || "Indeterminado"}
- Valor: ${c.valor_total_estimado || "N/A"} EUR
- Trata Dados Pessoais: ${c.tratamento_dados_pessoais ? "Sim" : "Não"}
- Tem Cláusula Confidencialidade: ${c.flag_confidencialidade ? "Sim" : "Não"}
`).join("\n");

  return `${eventoInfo}\n\nCONTRATOS ATIVOS (${contratos.length} total):\n${contratosInfo}\n\nAnalise o impacto deste evento legislativo em cada contrato e identifique ações necessárias para garantir conformidade.`;
}

function buildComplianceCheckPrompt(evento: Record<string, unknown> | null, contratos: Record<string, unknown>[]): string {
  const eventoInfo = `
EVENTO LEGISLATIVO:
- Título: ${evento?.titulo || "N/A"}
- Descrição: ${evento?.descricao_resumo || "N/A"}
- Referência Legal: ${evento?.referencia_legal || "N/A"}
`;

  const contratosInfo = contratos.map((c, i) => `
CONTRATO ${i + 1}:
- ID: ${c.id}
- Título: ${c.titulo_contrato}
- Tipo: ${c.tipo_contrato}
- Objeto: ${c.objeto_resumido || "N/A"}
- Obrigações Parte A: ${c.obrigacoes_parte_a || "N/A"}
- Obrigações Parte B: ${c.obrigacoes_parte_b || "N/A"}
`).join("\n");

  return `${eventoInfo}\n\nCONTRATOS A VERIFICAR:\n${contratosInfo}\n\nFaça uma análise detalhada de conformidade.`;
}

function buildContractCompliancePrompt(textContent: string, tipoContrato: string, eventos: Record<string, unknown>[], areasDireito: string[]): string {
  const tipoContratoLabels: Record<string, string> = {
    nda: "Acordo de Confidencialidade (NDA)",
    prestacao_servicos: "Prestação de Serviços",
    fornecimento: "Fornecimento",
    saas: "Software as a Service (SaaS)",
    arrendamento: "Arrendamento",
    trabalho: "Contrato de Trabalho",
    licenciamento: "Licenciamento",
    parceria: "Parceria",
    consultoria: "Consultoria",
    outro: "Outro"
  };

  const areasDireitoLabels: Record<string, string> = {
    laboral: "Laboral",
    fiscal: "Fiscal",
    comercial: "Comercial",
    protecao_dados: "Proteção de Dados (RGPD)",
    ambiente: "Ambiente",
    seguranca_trabalho: "Segurança no Trabalho",
    societario: "Societário",
    ciberseguranca: "Cibersegurança (NIS2)",
    outro: "Outro"
  };

  const areasClassificadas = areasDireito.length > 0 
    ? areasDireito.map(a => areasDireitoLabels[a] || a).join(", ")
    : "Todas as áreas";

  const contratoInfo = `
CONTRATO A ANALISAR:
- Tipo de Contrato: ${tipoContratoLabels[tipoContrato] || tipoContrato}
- Áreas de Direito Classificadas: ${areasClassificadas}

TEXTO COMPLETO DO CONTRATO:
${textContent.substring(0, 100000)}
`;

  const eventosInfo = eventos.map((e, i) => `
EVENTO LEGISLATIVO ${i + 1}:
- ID: ${e.id}
- Título: ${e.titulo}
- Área de Direito: ${e.area_direito}
- Referência Legal: ${e.referencia_legal || "N/A"}
- Descrição: ${e.descricao_resumo || "N/A"}
- Data Entrada em Vigor: ${e.data_entrada_vigor || "N/A"}
`).join("\n");

  return `${contratoInfo}\n\nEVENTOS LEGISLATIVOS A VERIFICAR (${eventos.length} total):\n${eventosInfo}\n\nAnalise o contrato e verifique a conformidade com CADA evento legislativo listado. Identifique todos os gaps e forneça recomendações específicas.`;
}
