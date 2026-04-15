// ALL external libraries are imported dynamically to avoid crashing the edge
// function during module initialisation on Supabase Edge Runtime / Deno v2.x.
//
// AI: Claude Sonnet 4.6 (claude-sonnet-4-6) via Anthropic Messages API
// Context window: 200K tokens — max output: 16K tokens

import { corsHeaders } from "../_shared/cors.ts";

const CLAUDE_SONNET = "claude-sonnet-4-6";
// 150K chars ≈ 37K tokens — seguro para Haiku 200K context.
// Apenas como salvaguarda; a maioria dos contratos fica bem abaixo disto.
const MAX_CHARS = 150000;

async function callClaude(
  apiKey: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
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
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Claude retornou resposta vazia");
  return text;
}

function parseJSONResponse(content: string): unknown {
  let jsonStr = content.trim();

  // Strip code-block wrappers
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  // Extract outermost braces
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  // First attempt: direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (_firstErr) {
    // noop — try repairs below
  }

  // Repair: remove trailing commas before } or ]
  let repaired = jsonStr.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(repaired);
  } catch (_secondErr) {
    // noop
  }

  // Repair: if JSON was truncated (no closing }), try to close it
  // Count unmatched braces/brackets and close them
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
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

  // Remove any trailing incomplete key-value (after last comma)
  if (openBraces > 0 || openBrackets > 0) {
    // Strip incomplete trailing value after last comma
    repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
    // Close open brackets/braces
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    // Remove trailing commas again
    repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  }

  return JSON.parse(repaired);
}

Deno.serve(async (req) => {
  console.log(`[parse-contract] v4-claude – ${req.method} request received`);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: `Method ${req.method} not allowed` }),
        { status: 405, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { textContent, fileContent, fileName, mimeType, storagePath } = body;

    console.log(`[parse-contract] payload keys: ${Object.keys(body).join(", ")}`);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não está configurada");
    }

    let contractText = textContent as string | undefined;
    let isScannedPDF = false;

    // ── 1. Obter conteúdo do ficheiro ──────────────────────────────────────
    if (!contractText) {
      let fileBytes: Uint8Array | null = null;
      let resolvedMime = mimeType as string | undefined;
      let resolvedName = fileName as string | undefined;

      if (storagePath) {
        console.log("Downloading file from storage:", storagePath);
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
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

        if (!resolvedMime) {
          const lower = (resolvedName ?? storagePath).toLowerCase();
          if (lower.endsWith(".pdf")) resolvedMime = "application/pdf";
          else if (lower.endsWith(".docx")) resolvedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          else if (lower.endsWith(".doc")) resolvedMime = "application/msword";
          else if (lower.endsWith(".txt")) resolvedMime = "text/plain";
        }
        if (!resolvedName) {
          resolvedName = storagePath.split("/").pop() ?? "document";
        }
      } else if (fileContent) {
        console.log("Processing file from base64:", resolvedName, "Type:", resolvedMime);
        const binaryStr = atob(fileContent as string);
        fileBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          fileBytes[i] = binaryStr.charCodeAt(i);
        }
      }

      if (fileBytes) {
        if (resolvedMime === "application/pdf" || resolvedName?.endsWith(".pdf")) {
          const extracted = await extractTextFromPDF(fileBytes);
          contractText = extracted.text;
          isScannedPDF = extracted.isScanned;
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
            { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (!contractText) {
      return new Response(
        JSON.stringify({ error: "Conteúdo do contrato é obrigatório" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // ── 2. Analisar contrato com Claude Haiku 4.5 ─────────────────────────
    console.log(`[parse-contract] Text length: ${contractText.length} chars, scanned: ${isScannedPDF}`);

    const truncatedText = contractText.length > MAX_CHARS
      ? contractText.substring(0, MAX_CHARS) + "\n\n[Nota: documento truncado após 150 000 caracteres]"
      : contractText;

    if (contractText.length > MAX_CHARS) {
      console.warn(`[parse-contract] Text truncated from ${contractText.length} to ${MAX_CHARS} chars`);
    }

    const systemPrompt = `Você é um assistente jurídico sénior especializado em análise detalhada de contratos portugueses e europeus.
Analise CUIDADOSAMENTE o texto do contrato fornecido e extraia TODAS as informações relevantes de forma estruturada e completa.
IMPORTANTE: Leia o documento inteiro antes de responder. Não deixe campos em branco se a informação estiver disponível.

Responda APENAS com um JSON válido, sem markdown ou texto adicional.

O JSON deve ter esta estrutura exata:
{
  "titulo_contrato": "string - título completo do contrato como aparece no documento",
  "tipo_contrato": "string - um de: nda, prestacao_servicos, fornecimento, saas, arrendamento, trabalho, licenciamento, parceria, consultoria, outro (escolha o mais adequado ao conteúdo)",
  "objeto_resumido": "string - descrição detalhada do objeto do contrato, incluindo serviços/produtos específicos (máx 500 caracteres)",

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

  "tratamento_dados_pessoais": "boolean - o contrato envolve tratamento de dados pessoais",
  "existe_dpa_anexo_rgpd": "boolean - existe DPA ou anexo de proteção de dados",
  "transferencia_internacional": "boolean - há transferência internacional de dados pessoais",
  "papel_entidade": "string ou null - responsavel, subcontratante, corresponsavel (papel da parte A no tratamento de dados)",
  "categorias_dados_pessoais": "string ou null - categorias de dados pessoais tratados",

  "riscos_identificados": ["array de strings - potenciais riscos, lacunas ou pontos de atenção para revisão jurídica"],
  "recomendacoes": ["array de strings - sugestões de melhorias ou cláusulas em falta"],

  "foro_competente": "string ou null - tribunal ou foro competente",
  "lei_aplicavel": "string ou null - lei aplicável ao contrato (ex: Lei Portuguesa, RGPD)",
  "prazos_denuncia_rescisao": "string ou null - condições e prazos de denúncia ou rescisão",
  "aviso_previo_nao_renovacao_dias": "number ou null - dias de antecedência para não renovar",
  "tipo_renovacao_detail": "string ou null - detalhe adicional sobre renovação",
  "classificacao_juridica": "string ou null - classificação jurídica do contrato",

  "sumario_executivo": "string - resumo executivo do contrato em 2-3 frases para leitura rápida, em linguagem clara e acessível",
  "confianca": "number - nível de confiança da extração de 0 a 100 (baseado na qualidade do texto e clareza das informações)"
}

INSTRUÇÕES IMPORTANTES:
1. Leia TODO o texto antes de preencher os campos
2. Se a informação não existir claramente no texto, use null (não invente)
3. Para datas, converta sempre para o formato YYYY-MM-DD
4. Para valores monetários, extraia apenas o número (sem € ou símbolos)
5. Identifique corretamente quem é Parte A (geralmente o contratante/cliente) e Parte B (prestador/fornecedor)
6. Nas cláusulas importantes, seja específico sobre o conteúdo
7. Nos riscos, foque em lacunas legais, cláusulas desequilibradas ou ambiguidades
8. O sumario_executivo deve ser em português simples, percetível por um não-advogado`;

    const userMessage = isScannedPDF
      ? `ATENÇÃO: Este PDF contém pouco texto extraível — pode ser um documento digitalizado. Analise o texto disponível com o máximo detalhe possível.\n\nContrato:\n\n${truncatedText}`
      : `Analise detalhadamente o seguinte contrato e extraia TODAS as informações disponíveis:\n\n${truncatedText}`;

    console.log(`[parse-contract] Calling Claude Sonnet...`);
    const content = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userMessage, 16384);

    // ── 3. Parsear resposta JSON ───────────────────────────────────────────
    let parsedData;
    try {
      parsedData = parseJSONResponse(content);
    } catch (parseErr: any) {
      console.error("[parse-contract] Failed to parse AI response as JSON.");
      console.error("[parse-contract] Parse error:", parseErr.message);
      console.error("[parse-contract] Response length:", content.length, "chars");
      console.error("[parse-contract] Response start:", content.substring(0, 300));
      console.error("[parse-contract] Response end:", content.substring(content.length - 300));
      throw new Error("Não foi possível processar a resposta da IA");
    }

    console.log("[parse-contract] Contract parsed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        extractedText: contractText,
        isScannedPDF,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[parse-contract] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar contrato" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});

// ── Extracção de texto de PDF via pdfjs-dist ──────────────────────────────
async function extractTextFromPDF(fileBytes: Uint8Array): Promise<{ text: string; isScanned: boolean }> {
  console.log("[parse-contract] Extracting text from PDF, size:", fileBytes.length);

  let pdfjs: any;
  try {
    pdfjs = await import("https://esm.sh/pdfjs-dist@4.8.69/build/pdf.min.mjs?external=canvas");
  } catch (importErr: any) {
    console.error("[parse-contract] Failed to import pdfjs-dist:", importErr.message);
    throw new Error(
      "Não foi possível carregar o módulo de leitura de PDF. Tente converter o ficheiro para .docx ou .txt.",
    );
  }

  // Point to the matching worker version on esm.sh (required by pdfjs-dist)
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://esm.sh/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs?external=canvas";

  const pdf = await pdfjs.getDocument({ data: fileBytes }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(pageText);
  }

  const fullText = pages.join("\n\n");

  // PDF digitalizado: texto extraído vazio ou muito curto
  const isScanned = !fullText || fullText.trim().length < 100;

  if (isScanned) {
    console.warn("[parse-contract] PDF parece ser digitalizado (texto < 100 chars). A tentar análise com o texto disponível.");
    // Não lançar erro — deixar Claude tentar com o texto disponível (pode ter algum OCR embutido)
    return { text: fullText || "[PDF digitalizado — texto não extraível]", isScanned: true };
  }

  console.log("[parse-contract] PDF text extracted, length:", fullText.length);
  return { text: fullText, isScanned: false };
}

// ── Extracção de texto de Word (.docx) via zip.js ─────────────────────────
async function extractTextFromWord(fileBytes: Uint8Array, fileName: string): Promise<string> {
  console.log("[parse-contract] Extracting text from Word document:", fileName);

  try {
    const { BlobReader, ZipReader, TextWriter } = await import(
      "https://deno.land/x/zipjs@v2.7.32/index.js"
    );

    const blob = new Blob([fileBytes]);
    const zipReader = new ZipReader(new BlobReader(blob));
    const entries = await zipReader.getEntries();

    const documentEntry = entries.find(
      (e: any) => e.filename === "word/document.xml" || e.filename === "word\\document.xml",
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

    console.log("[parse-contract] Word text extracted, length:", text.length);
    return text;
  } catch (error: any) {
    console.error("[parse-contract] Error extracting text from Word:", error);

    if (fileName?.endsWith(".doc") && !fileName?.endsWith(".docx")) {
      throw new Error(
        "Ficheiros .doc (formato antigo) não são suportados. Por favor, converta para .docx ou PDF.",
      );
    }

    throw new Error(
      "Não foi possível ler o ficheiro Word. Verifique se não está corrompido ou tente converter para PDF.",
    );
  }
}

// ── Parseamento XML do documento Word ─────────────────────────────────────
function extractTextFromXml(xml: string): string {
  const withBreaks = xml.replace(/<\/w:p>/g, "\n");

  const allText: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(withBreaks)) !== null) {
    allText.push(m[1]);
  }

  const decode = (s: string) =>
    s.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

  return allText.map(decode).join("").replace(/\n{3,}/g, "\n\n").trim();
}
