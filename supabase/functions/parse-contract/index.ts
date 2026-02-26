import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { BlobReader, ZipReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = [
  { model: "gemini-2.0-flash",      name: "Gemini 2.0 Flash" },
  { model: "gemini-1.5-flash",      name: "Gemini 1.5 Flash" },
  { model: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
];

// Models that support PDF/image documents
const MULTIMODAL_MODELS = [
  { model: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { model: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
];

async function callAIWithFallback(
  apiKey: string,
  messages: Array<{ role: string; content: any }>,
  functionName: string,
  modelsOverride?: typeof AI_MODELS
): Promise<{ content: string; model: string }> {
  const models = modelsOverride ?? AI_MODELS;
  let lastError: Error | null = null;

  for (const { model, name } of models) {
    try {
      console.log(`[${functionName}] Trying ${name} (${model})...`);

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { textContent, fileContent, fileName, mimeType, storagePath } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let contractText = textContent as string | undefined;

    // ── 1. Obter conteúdo do ficheiro ──────────────────────────────────────
    if (!contractText) {
      let fileBytes: Uint8Array | null = null;
      let resolvedMime = mimeType as string | undefined;
      let resolvedName = fileName as string | undefined;

      if (storagePath) {
        // Novo fluxo: descarregar o ficheiro do Supabase Storage
        console.log("Downloading file from storage:", storagePath);
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: blob, error: storageError } = await supabase.storage
          .from("contratos")
          .download(storagePath);

        if (storageError || !blob) {
          throw new Error(`Erro ao descarregar ficheiro: ${storageError?.message ?? "ficheiro não encontrado"}`);
        }

        const arrayBuffer = await blob.arrayBuffer();
        fileBytes = new Uint8Array(arrayBuffer);

        // Inferir MIME type a partir do nome se não vier no pedido
        if (!resolvedMime) {
          const lower = (resolvedName ?? storagePath).toLowerCase();
          if (lower.endsWith(".pdf"))  resolvedMime = "application/pdf";
          else if (lower.endsWith(".docx")) resolvedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          else if (lower.endsWith(".doc"))  resolvedMime = "application/msword";
          else if (lower.endsWith(".txt"))  resolvedMime = "text/plain";
        }
        if (!resolvedName) {
          resolvedName = storagePath.split("/").pop() ?? "document";
        }

      } else if (fileContent) {
        // Fluxo legado: base64 no corpo do pedido
        console.log("Processing file from base64:", resolvedName, "Type:", resolvedMime);
        const binaryStr = atob(fileContent as string);
        fileBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          fileBytes[i] = binaryStr.charCodeAt(i);
        }
      }

      if (fileBytes) {
        if (resolvedMime === "application/pdf" || resolvedName?.endsWith(".pdf")) {
          contractText = await extractTextFromPDF(fileBytes, GEMINI_API_KEY);
        } else if (
          resolvedMime?.includes("word") ||
          resolvedName?.endsWith(".docx") ||
          resolvedName?.endsWith(".doc")
        ) {
          contractText = await extractTextFromWord(fileBytes, resolvedName ?? "document.docx");
        } else if (resolvedMime === "text/plain" || resolvedName?.endsWith(".txt")) {
          contractText = new TextDecoder().decode(fileBytes);
        } else {
          return new Response(
            JSON.stringify({ error: "Formato de ficheiro não suportado. Use PDF, Word ou TXT." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!contractText) {
      return new Response(
        JSON.stringify({ error: "Conteúdo do contrato é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Analisar contrato com IA ────────────────────────────────────────
    console.log("Parsing contract text, length:", contractText.length);

    const systemPrompt = `Você é um assistente jurídico sénior especializado em análise detalhada de contratos portugueses e europeus.
Analise CUIDADOSAMENTE o texto do contrato fornecido e extraia TODAS as informações relevantes de forma estruturada e completa.
IMPORTANTE: Leia o documento inteiro antes de responder. Não deixe campos em branco se a informação estiver disponível.

Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura exata:
{
  "titulo_contrato": "string - título completo do contrato como aparece no documento",
  "tipo_contrato": "string - um de: nda, prestacao_servicos, fornecimento, saas, arrendamento, trabalho, licenciamento, parceria, consultoria, outro (escolha o mais adequado ao conteúdo)",
  "objeto_resumido": "string - descrição detalhada do objeto do contrato, incluindo serviços/produtos específicos (máx 800 caracteres)",

  "parte_a_nome_legal": "string - nome legal completo da PRIMEIRA OUTORGANTE/CONTRATANTE (inclui forma jurídica: Lda, SA, etc.)",
  "parte_a_nif": "string ou null - NIF/NIPC da primeira parte (9 dígitos em Portugal)",
  "parte_a_morada": "string ou null - morada completa incluindo código postal e localidade",
  "parte_a_representante": "string ou null - nome do representante legal que assina pelo primeiro outorgante",
  "parte_a_cargo": "string ou null - cargo do representante (ex: Gerente, Administrador, CEO)",

  "parte_b_nome_legal": "string - nome legal completo da SEGUNDA OUTORGANTE/CONTRATADA",
  "parte_b_nif": "string ou null - NIF/NIPC da segunda parte",
  "parte_b_morada": "string ou null - morada completa incluindo código postal e localidade",
  "parte_b_representante": "string ou null - nome do representante legal que assina pelo segundo outorgante",
  "parte_b_cargo": "string ou null - cargo do representante",

  "data_assinatura": "string ou null - data de assinatura/celebração no formato YYYY-MM-DD",
  "data_inicio_vigencia": "string ou null - data de início de vigência no formato YYYY-MM-DD (pode ser diferente da assinatura)",
  "data_termo": "string ou null - data de término/fim no formato YYYY-MM-DD",

  "valor_total_estimado": "number ou null - valor total do contrato em euros (apenas número, sem símbolos)",
  "valor_mensal": "number ou null - valor mensal se aplicável",
  "moeda": "string - código ISO da moeda (EUR, USD, GBP, etc.)",
  "iva_incluido": "boolean - true se os valores já incluem IVA",
  "prazo_pagamento_dias": "number ou null - prazo de pagamento em dias após faturação",
  "periodicidade_faturacao": "string ou null - mensal, trimestral, semestral, anual, por_marco, a_cabeca",

  "tipo_duracao": "string - prazo_determinado ou prazo_indeterminado",
  "duracao_meses": "number ou null - duração total em meses se prazo determinado",
  "tipo_renovacao": "string - sem_renovacao_automatica, renovacao_automatica ou renovacao_mediante_acordo",
  "renovacao_periodo_meses": "number ou null - período de cada renovação em meses",
  "aviso_denuncia_dias": "number ou null - dias de antecedência para denunciar/não renovar",

  "obrigacoes_parte_a": "string ou null - principais obrigações do primeiro outorgante (resumo)",
  "obrigacoes_parte_b": "string ou null - principais obrigações do segundo outorgante (resumo)",
  "sla_indicadores": "string ou null - SLAs ou indicadores de desempenho mencionados",

  "clausulas_importantes": ["array de strings - cláusulas chave do contrato com descrição breve"],
  "clausulas_especiais": {
    "confidencialidade": "boolean - existe cláusula de confidencialidade",
    "nao_concorrencia": "boolean - existe cláusula de não concorrência",
    "exclusividade": "boolean - existe cláusula de exclusividade",
    "propriedade_intelectual": "boolean - menciona propriedade intelectual",
    "protecao_dados": "boolean - menciona RGPD ou proteção de dados",
    "subcontratacao": "boolean - permite subcontratação",
    "penalidades": "boolean - prevê penalidades por incumprimento",
    "resolucao_litigios": "string ou null - forma de resolução (tribunais, arbitragem, mediação)"
  },

  "riscos_identificados": ["array de strings - potenciais riscos, lacunas ou pontos de atenção para revisão jurídica"],
  "recomendacoes": ["array de strings - sugestões de melhorias ou cláusulas em falta"],

  "foro_competente": "string ou null - tribunal ou foro competente",
  "lei_aplicavel": "string ou null - lei aplicável ao contrato (ex: Lei Portuguesa)",

  "sumario_executivo": "string - resumo executivo do contrato em 2-3 frases para leitura rápida",
  "confianca": "number - nível de confiança da extração de 0 a 100 (baseado na qualidade do texto e clareza das informações)"
}

INSTRUÇÕES IMPORTANTES:
1. Leia TODO o texto antes de preencher os campos
2. Se a informação não existir claramente no texto, use null (não invente)
3. Para datas, converta sempre para o formato YYYY-MM-DD
4. Para valores monetários, extraia apenas o número (sem € ou símbolos)
5. Identifique corretamente quem é Parte A (geralmente o contratante/cliente) e Parte B (prestador/fornecedor)
6. Nas cláusulas importantes, seja específico sobre o conteúdo
7. Nos riscos, foque em lacunas legais, cláusulas desequilibradas ou ambiguidades`;

    // Limitar o texto para evitar exceder os limites de tokens da API (≈ 60 000 chars ≈ 15 000 tokens)
    const MAX_CHARS = 60000;
    const truncatedText = contractText.length > MAX_CHARS
      ? contractText.substring(0, MAX_CHARS) + "\n\n[Nota: documento truncado — apenas os primeiros 60 000 caracteres foram analisados]"
      : contractText;

    if (contractText.length > MAX_CHARS) {
      console.warn(`Contract text truncated from ${contractText.length} to ${MAX_CHARS} chars`);
    }

    const { content } = await callAIWithFallback(
      GEMINI_API_KEY,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise detalhadamente o seguinte contrato e extraia TODAS as informações disponíveis:\n\n${truncatedText}` }
      ],
      "parse-contract"
    );

    // ── 3. Parsear resposta JSON ───────────────────────────────────────────
    let parsedData;
    try {
      let jsonStr = content.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      }
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace  = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", content.substring(0, 500));
      throw new Error("Não foi possível processar a resposta da IA");
    }

    console.log("Contract parsed successfully");

    return new Response(
      JSON.stringify({ success: true, data: parsedData, extractedText: contractText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in parse-contract function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar contrato" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Extracção de texto de PDF via AI multimodal (Gemini suporta inline PDF) ──
async function extractTextFromPDF(fileBytes: Uint8Array, apiKey: string): Promise<string> {
  console.log("Extracting text from PDF, size:", fileBytes.length);

  const base64Content = encodeBase64(fileBytes);

  const { content: extractedText } = await callAIWithFallback(
    apiKey,
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraia todo o texto deste documento de contrato PDF. Retorne apenas o texto completo do documento, preservando a estrutura e formatação original. Não adicione comentários ou interpretações.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64Content}`,
            },
          },
        ],
      },
    ],
    "parse-contract-pdf",
    MULTIMODAL_MODELS
  );

  console.log("PDF text extracted, length:", extractedText.length);
  return extractedText;
}

// ── Extracção de texto de Word (.docx) via zip.js ─────────────────────────
async function extractTextFromWord(fileBytes: Uint8Array, fileName: string): Promise<string> {
  console.log("Extracting text from Word document:", fileName);

  try {
    const blob = new Blob([fileBytes]);
    const zipReader = new ZipReader(new BlobReader(blob));
    const entries = await zipReader.getEntries();

    const documentEntry = entries.find(
      (e: any) => e.filename === "word/document.xml" || e.filename === "word\\document.xml"
    );

    if (!documentEntry || !documentEntry.getData) {
      throw new Error("Ficheiro Word inválido: document.xml não encontrado");
    }

    const textWriter = new TextWriter();
    const xmlContent = await documentEntry.getData(textWriter);
    await zipReader.close();

    const text = extractTextFromXml(xmlContent);

    if (!text || text.trim().length === 0) {
      throw new Error("Não foi possível extrair texto do documento Word");
    }

    console.log("Word text extracted, length:", text.length);
    return text;

  } catch (error: any) {
    console.error("Error extracting text from Word:", error);

    if (fileName?.endsWith(".doc") && !fileName?.endsWith(".docx")) {
      throw new Error(
        "Ficheiros .doc (formato antigo) não são suportados. Por favor, converta para .docx ou PDF."
      );
    }

    throw new Error(
      "Não foi possível ler o ficheiro Word. Verifique se não está corrompido ou tente converter para PDF."
    );
  }
}

// ── Parseamento XML do documento Word ─────────────────────────────────────
function extractTextFromXml(xml: string): string {
  // Substituir fins de parágrafo por newline
  const withBreaks = xml.replace(/<\/w:p>/g, "\n");

  // Extrair conteúdo de todas as tags <w:t>
  const allText: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(withBreaks)) !== null) {
    allText.push(m[1]);
  }

  // Descodificar entidades XML básicas
  const decode = (s: string) =>
    s.replace(/&amp;/g, "&")
     .replace(/&lt;/g,  "<")
     .replace(/&gt;/g,  ">")
     .replace(/&quot;/g, '"')
     .replace(/&apos;/g, "'");

  const finalText = allText.map(decode).join("");

  // Normalizar newlines múltiplos
  return finalText.replace(/\n{3,}/g, "\n\n").trim();
}
