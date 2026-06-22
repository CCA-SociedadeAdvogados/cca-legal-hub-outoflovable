import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude as anthropicMessage } from "../_shared/callAI.ts";

// AI: Claude Sonnet 4.6 — segunda passagem de validação e correcção de campos críticos
const CLAUDE_SONNET = "claude-sonnet-4-6";

async function callClaude(
  apiKey: string,
  system: string,
  user: string,
  maxTokens = 2048,
): Promise<string> {
  return anthropicMessage({ apiKey, model: CLAUDE_SONNET, system, user, maxTokens });
}

function parseJSONResponse(content: string): unknown {
  let jsonStr = content.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    // noop — try repairs
  }

  let repaired = jsonStr.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(repaired);
  } catch {
    // noop
  }

  // Try closing truncated JSON
  let openBraces = 0, openBrackets = 0, inString = false, escape = false;
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
  if (openBraces > 0 || openBrackets > 0) {
    repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  }
  return JSON.parse(repaired);
}

// Campos críticos para cálculo de diff e validação
const CRITICAL_FIELDS = [
  "tipo_contrato",
  "data_inicio_vigencia",
  "data_termo",
  "tipo_renovacao",
  "renovacao_periodo_meses",
  "aviso_previo_nao_renovacao_dias",
  "prazos_denuncia_rescisao",
  "lei_aplicavel",
  "foro_arbitragem",
  "tratamento_dados_pessoais",
  "existe_dpa_anexo_rgpd",
  "transferencia_internacional",
  "classificacao_juridica",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { contract_id, extraction_draft } = await req.json();

    if (!contract_id || !extraction_draft) {
      return new Response(
        JSON.stringify({ error: "contract_id e extraction_draft são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não está configurada");
    }

    console.log(`[validate-contract] Starting validation for ${contract_id}`);

    // Marcar como validating
    await supabase.from("contratos").update({ validation_status: "validating" }).eq("id", contract_id);

    // Registar início do job
    await supabase.from("contract_extractions").upsert({
      contrato_id: contract_id,
      source: "cca_agent",
      status: "provisional",
      extraction_data: {},
      job_started_at: new Date().toISOString(),
    }, { onConflict: "contrato_id,source" });

    // === VALIDAÇÃO COM CLAUDE SONNET ===
    const systemPrompt = `Você é um validador jurídico especializado em contratos portugueses.
A sua função é fazer uma segunda passagem de validação sobre uma extracção de contrato feita por IA, focando nos campos críticos.

Para cada campo crítico, verifique:
1. Consistência lógica (ex: data_termo deve ser posterior a data_inicio_vigencia)
2. Formato correcto (datas em YYYY-MM-DD, valores numéricos sem unidades)
3. Coerência com o tipo de contrato
4. Classificação RGPD correcta (tratamento_dados_pessoais, papel_entidade)
5. Lei aplicável e foro competente plausíveis

Responda APENAS com um JSON válido, sem markdown.

Estrutura de resposta:
{
  "extraction_canonical": {
    // Repetir TODOS os campos do extraction_draft, corrigindo apenas os que estiverem errados.
    // Não omitir campos — copiar os correctos tal como estão.
  },
  "status": "validated",
  "confidence": <number 0-100>,
  "review_notes": "string - notas sobre correcções efectuadas ou confirmação de que está correcto",
  "evidence": [
    // Array de strings com justificações para cada correcção efectuada (pode ser vazio)
  ],
  "classificacao_juridica": "string ou null - classificação jurídica precisa do contrato"
}`;

    const criticalFieldsData = CRITICAL_FIELDS.reduce((acc, field) => {
      if (extraction_draft[field] !== undefined) {
        acc[field] = extraction_draft[field];
      }
      return acc;
    }, {} as Record<string, unknown>);

    const userMessage = `Valide e corrija os seguintes campos extraídos de um contrato.

EXTRACÇÃO COMPLETA:
${JSON.stringify(extraction_draft, null, 2)}

CAMPOS CRÍTICOS PARA REVISÃO PRIORITÁRIA:
${JSON.stringify(criticalFieldsData, null, 2)}

Por favor valide a consistência e corrija quaisquer erros nos campos críticos.`;

    console.log(`[validate-contract] Calling Claude Sonnet for validation...`);

    let canonicalResult: Record<string, unknown>;
    try {
      const content = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userMessage, 2048);
      canonicalResult = parseJSONResponse(content) as Record<string, unknown>;
    } catch (claudeErr) {
      const claudeErrMessage = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
      console.error(`[validate-contract] Claude validation failed:`, claudeErrMessage);

      // Em caso de falha, usar o draft como canonical (melhor que bloquear)
      canonicalResult = {
        extraction_canonical: extraction_draft,
        status: "draft_only",
        confidence: 70,
        review_notes: `Validação automática falhou: ${claudeErrMessage}. A usar extracção inicial.`,
        evidence: [],
      };
    }

    // === CALCULAR DIFF ===
    const canonicalData = (canonicalResult.extraction_canonical || extraction_draft) as Record<string, unknown>;
    const diff: Record<string, { draft: unknown; canonical: unknown }> = {};

    for (const field of CRITICAL_FIELDS) {
      const d = JSON.stringify(extraction_draft?.[field]);
      const c = JSON.stringify(canonicalData[field]);
      if (d !== c && (d !== undefined || c !== undefined)) {
        diff[field] = { draft: extraction_draft?.[field] ?? null, canonical: canonicalData[field] ?? null };
      }
    }

    // === GRAVAR CANONICAL ===
    const finalStatus = canonicalResult.status || "validated";

    await supabase.from("contract_extractions").upsert({
      contrato_id: contract_id,
      source: "cca_agent",
      status: finalStatus,
      extraction_data: canonicalData,
      confidence: canonicalResult.confidence ?? null,
      evidence: canonicalResult.evidence ?? [],
      review_notes: canonicalResult.review_notes ?? null,
      diff_from_draft: Object.keys(diff).length > 0 ? diff : null,
      classificacao_juridica: canonicalResult.classificacao_juridica ?? canonicalData.classificacao_juridica ?? null,
      prazos: {
        data_inicio: canonicalData.data_inicio_vigencia,
        data_termo: canonicalData.data_termo,
        renovacao: canonicalData.tipo_renovacao,
        periodo_meses: canonicalData.renovacao_periodo_meses,
      },
      denuncia_rescisao: {
        aviso_previo: canonicalData.aviso_previo_nao_renovacao_dias,
        detalhes: canonicalData.prazos_denuncia_rescisao,
      },
      lei_aplicavel: canonicalData.lei_aplicavel ?? null,
      foro_arbitragem: canonicalData.foro_competente ?? canonicalData.foro_arbitragem ?? null,
      rgpd_summary: {
        dados_pessoais: canonicalData.tratamento_dados_pessoais,
        dpa: canonicalData.existe_dpa_anexo_rgpd,
        transferencia: canonicalData.transferencia_internacional,
        paises: canonicalData.paises_transferencia,
      },
      job_completed_at: new Date().toISOString(),
    }, { onConflict: "contrato_id,source" });

    await supabase.from("contratos").update({ validation_status: finalStatus }).eq("id", contract_id);

    // Audit log se houve diferenças
    if (Object.keys(diff).length > 0) {
      await supabase.from("audit_logs").insert({
        action: "cca_validation_diff",
        table_name: "contract_extractions",
        record_id: contract_id,
        user_id: "00000000-0000-0000-0000-000000000000",
        old_data: {
          source: "ai_extraction",
          fields: Object.fromEntries(Object.entries(diff).map(([k, v]) => [k, v.draft])),
        },
        new_data: {
          source: "claude_validation",
          fields: Object.fromEntries(Object.entries(diff).map(([k, v]) => [k, v.canonical])),
        },
        metadata: { diff_count: Object.keys(diff).length, critical_fields: Object.keys(diff) },
      }).catch((e) => console.warn("[validate-contract] Audit log insert failed:", e));
    }

    console.log(`[validate-contract] Done. Status: ${finalStatus}, Diffs: ${Object.keys(diff).length}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        has_diff: Object.keys(diff).length > 0,
        diff_fields: Object.keys(diff),
        confidence: canonicalResult.confidence,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[validate-contract] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
