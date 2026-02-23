import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

interface AnalysisRequest {
  type: string;
  language?: string; // 'pt' ou 'en'
  data: {
    textContent?: string;
    fileContent?: string;
    fileName?: string;
    mimeType?: string;
    context?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, language = 'pt', data }: AnalysisRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(type, language);
    let messages: any[] = [{ role: "system", content: systemPrompt }];
    let textContent = data.textContent || "";

    // If file content is provided, handle based on type
    if (data.fileContent && !data.textContent) {
      const isPdf = data.mimeType === 'application/pdf' || data.fileName?.endsWith('.pdf');
      const isDocx = data.fileName?.endsWith('.docx');
      const isLegacyDoc = data.fileName?.endsWith('.doc') && !data.fileName?.endsWith('.docx');
      const isWord = data.mimeType?.includes('word') || isDocx || isLegacyDoc;

      if (isPdf) {
        console.log(`Sending PDF directly to Gemini for analysis: ${data.fileName}`);
        const pdfPrompt = language === 'en' 
          ? "Analyze this PDF document and extract all relevant information as requested."
          : "Analise este documento PDF e extraia todas as informações relevantes conforme solicitado.";
        
        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${data.fileContent}`
              }
            },
            {
              type: "text",
              text: pdfPrompt
            }
          ]
        });
      } else if (isWord) {
        if (isDocx) {
          console.log(`Extracting text from DOCX document: ${data.fileName}`);
          textContent = await extractTextFromWord(data.fileContent);
          const docPrompt = language === 'en'
            ? `Analyze the following document:\n\n${textContent.substring(0, 12000)}`
            : `Analise o seguinte documento:\n\n${textContent.substring(0, 12000)}`;
          messages.push({
            role: "user",
            content: docPrompt
          });
        } else {
          console.log(`Legacy DOC format not supported: ${data.fileName}`);
          const errorMsg = language === 'en' 
            ? "Legacy Word format (.doc) is not supported. Please convert your document to PDF or DOCX format and try again."
            : "O formato Word antigo (.doc) não é suportado. Por favor, converta o documento para PDF ou DOCX e tente novamente.";
          return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const errorMsg = language === 'en' 
          ? "Unsupported file format. Use PDF or Word."
          : "Formato de ficheiro não suportado. Use PDF ou Word.";
        throw new Error(errorMsg);
      }
    } else if (textContent) {
      const docPrompt = language === 'en'
        ? `Analyze the following document:\n\n${textContent.substring(0, 12000)}`
        : `Analise o seguinte documento:\n\n${textContent.substring(0, 12000)}`;
      messages.push({
        role: "user",
        content: docPrompt
      });
    } else {
      const errorMsg = language === 'en'
        ? "No content provided for analysis"
        : "Nenhum conteúdo fornecido para análise";
      throw new Error(errorMsg);
    }

    console.log(`Processing ${type} analysis in ${language}`);

    const { content } = await callAIWithFallback(
      LOVABLE_API_KEY!,
      messages,
      "analyze-document"
    );

    console.log("AI Response received, parsing JSON...");

    let parsedData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      const errorMsg = language === 'en'
        ? "Could not process AI response"
        : "Não foi possível processar a resposta da IA";
      throw new Error(errorMsg);
    }

    console.log(`${type} analysis completed successfully`);

    const extractedTextMsg = language === 'en' ? "Content extracted from PDF" : "Conteúdo extraído do PDF";

    return new Response(
      JSON.stringify({ success: true, data: parsedData, extractedText: textContent || extractedTextMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-document function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar análise" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractTextFromWord(base64Content: string): Promise<string> {
  const zipjs = await import("https://deno.land/x/zipjs@v2.7.30/index.js");
  const { BlobReader, ZipReader, TextWriter } = zipjs;
  
  try {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes]);
    
    const zipReader = new ZipReader(new BlobReader(blob));
    const entries = await zipReader.getEntries();
    
    const documentEntry = entries.find((e: { filename: string }) => e.filename === "word/document.xml");
    if (!documentEntry || !documentEntry.getData) {
      await zipReader.close();
      throw new Error("Invalid Word file");
    }
    
    const xmlContent = await documentEntry.getData(new TextWriter());
    await zipReader.close();
    
    // Extract text from XML tags
    const text = (xmlContent as string)
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    console.log(`Word extraction complete, extracted ${text.length} characters`);
    return text;
  } catch (error) {
    console.error("Error extracting Word text:", error);
    throw new Error("Error extracting text from Word file");
  }
}

function getSystemPrompt(type: string, language: string = 'pt'): string {
  if (language === 'en') {
    return getEnglishPrompt(type);
  }
  return getPortuguesePrompt(type);
}

function getEnglishPrompt(type: string): string {
  const basePrompt = `You are an expert in analyzing legal and compliance documents.
Analyze the provided document and extract relevant information.
Respond ONLY with valid JSON, no markdown or additional text.

The JSON must have this structure:
{
  "summary": "string - executive summary (max 300 chars)",
  "key_points": ["array of strings - main points"],
  "affected_areas": ["array of strings - legal/operational areas affected"],
  "recommendations": ["array of strings - content-based recommendations"],
  "identified_risks": ["array of strings - risks or attention points"],
  "confidence": "number - analysis confidence level from 0 to 100",
  "extracted_data": "object - specific data extracted by document type"
}`;

  const contextPrompts: Record<string, string> = {
    analyze_legislative_document: `${basePrompt}

For LEGISLATIVE DOCUMENTS, also extract in "extracted_data":
{
  "law_title": "string - official title of the law/regulation",
  "legal_reference": "string - number and date (e.g., Law No. 83/2021)",
  "area_of_law": "string - labor, tax, commercial, data_protection, environment, workplace_safety, corporate, other",
  "jurisdiction": "string - national, european, international",
  "publication_date": "string - date YYYY-MM-DD or null",
  "effective_date": "string - date YYYY-MM-DD or null"
}`,

    analyze_impact_document: `${basePrompt}

For IMPACT DOCUMENTS, also extract in "extracted_data":
{
  "impact_type": "string - regulatory, operational, financial, reputational",
  "risk_level": "string - low, medium, high",
  "potentially_affected_contracts": ["array of strings - types of contracts affected"],
  "action_deadline": "string - suggested deadline for actions"
}`,

    analyze_policy_document: `${basePrompt}

For INTERNAL POLICIES, also extract in "extracted_data":
{
  "policy_title": "string - policy title",
  "applicable_departments": ["array of strings - departments it applies to"],
  "key_procedures": ["array of strings - main procedures"],
  "responsibilities": ["array of strings - defined responsibilities"],
  "review_frequency": "string or null - review frequency",
  "version": "string or null - document version"
}`,

    analyze_template_document: `${basePrompt}

For DOCUMENT TEMPLATES, also extract in "extracted_data":
{
  "template_type": "string - contract, addendum, policy, communication, other",
  "identified_placeholders": ["array of strings - variables/placeholders found"],
  "mandatory_clauses": ["array of strings - identified mandatory clauses"]
}`,

    analyze_general_document: `${basePrompt}

For GENERAL DOCUMENTS, also extract in "extracted_data":
{
  "document_type": "string - identified document type",
  "document_date": "string - date YYYY-MM-DD or null",
  "parties_involved": ["array of strings - mentioned parties"],
  "main_subject": "string - main subject/object"
}`
  };

  return contextPrompts[type] || contextPrompts.analyze_general_document;
}

function getPortuguesePrompt(type: string): string {
  const basePrompt = `Você é um especialista em análise de documentos jurídicos e de conformidade portugueses.
Analise o documento fornecido e extraia informações relevantes.
Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura:
{
  "resumo": "string - resumo executivo do documento (máx 300 caracteres)",
  "pontos_principais": ["array de strings - pontos principais do documento"],
  "areas_afetadas": ["array de strings - áreas jurídicas/operacionais afetadas"],
  "recomendacoes": ["array de strings - recomendações baseadas no conteúdo"],
  "riscos_identificados": ["array de strings - riscos ou pontos de atenção"],
  "confianca": "number - nível de confiança da análise de 0 a 100",
  "dados_extraidos": "object - dados específicos extraídos conforme o tipo de documento"
}`;

  const contextPrompts: Record<string, string> = {
    analyze_legislative_document: `${basePrompt}

Para DOCUMENTOS LEGISLATIVOS, extraia também em "dados_extraidos":
{
  "titulo_lei": "string - título oficial da lei/regulamento",
  "referencia_legal": "string - número e data (ex: Lei n.º 83/2021)",
  "area_direito": "string - laboral, fiscal, comercial, protecao_dados, ambiente, seguranca_trabalho, societario, outro",
  "jurisdicao": "string - nacional, europeia, internacional",
  "data_publicacao": "string - data YYYY-MM-DD ou null",
  "data_entrada_vigor": "string - data YYYY-MM-DD ou null"
}`,

    analyze_impact_document: `${basePrompt}

Para DOCUMENTOS DE IMPACTO, extraia também em "dados_extraidos":
{
  "tipo_impacto": "string - regulamentar, operacional, financeiro, reputacional",
  "nivel_risco": "string - baixo, medio, alto",
  "contratos_potencialmente_afetados": ["array de strings - tipos de contratos afetados"],
  "prazo_acao": "string - prazo sugerido para ações"
}`,

    analyze_policy_document: `${basePrompt}

Para POLÍTICAS INTERNAS, extraia também em "dados_extraidos":
{
  "titulo_politica": "string - título da política",
  "departamentos_aplicaveis": ["array de strings - departamentos a que se aplica"],
  "procedimentos_chave": ["array de strings - procedimentos principais"],
  "responsabilidades": ["array de strings - responsabilidades definidas"],
  "periodicidade_revisao": "string ou null - frequência de revisão",
  "versao": "string ou null - versão do documento"
}`,

    analyze_template_document: `${basePrompt}

Para TEMPLATES DE DOCUMENTOS, extraia também em "dados_extraidos":
{
  "tipo_template": "string - contrato, adenda, politica, comunicacao, outro",
  "placeholders_identificados": ["array de strings - variáveis/placeholders encontrados"],
  "clausulas_obrigatorias": ["array de strings - cláusulas obrigatórias identificadas"]
}`,

    analyze_general_document: `${basePrompt}

Para DOCUMENTOS GERAIS, extraia também em "dados_extraidos":
{
  "tipo_documento": "string - tipo identificado do documento",
  "data_documento": "string - data YYYY-MM-DD ou null",
  "partes_envolvidas": ["array de strings - partes mencionadas"],
  "objeto_principal": "string - objeto/assunto principal"
}`
  };

  return contextPrompts[type] || contextPrompts.analyze_general_document;
}