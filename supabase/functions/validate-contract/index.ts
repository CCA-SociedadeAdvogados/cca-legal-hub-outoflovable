import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { contract_id, extraction_draft, document_reference, client_id, matter_id } = await req.json();

    if (!contract_id || !extraction_draft) {
      return new Response(
        JSON.stringify({ error: "contract_id e extraction_draft são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // === CHAMADA AO AGENTE CCA ===
    const CCA_AGENT_URL = Deno.env.get("CCA_AGENT_URL");
    const CCA_AGENT_KEY = Deno.env.get("CCA_AGENT_KEY");
    let canonicalResult: any;

    if (CCA_AGENT_URL) {
      // === PRODUÇÃO: Agente CCA real ===
      console.log(`[validate-contract] Calling CCA Agent: ${CCA_AGENT_URL}`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const ccaResponse = await fetch(`${CCA_AGENT_URL.replace(/\/$/, '')}/cca/validate-contract`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(CCA_AGENT_KEY ? { "X-API-Key": CCA_AGENT_KEY } : {}),
          },
          body: JSON.stringify({
            contract_id,
            document_reference: document_reference || null,
            extraction_draft,
            client_id: client_id || null,
            matter_id: matter_id || null,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!ccaResponse.ok) {
          throw new Error(`CCA Agent HTTP ${ccaResponse.status}: ${await ccaResponse.text()}`);
        }
        canonicalResult = await ccaResponse.json();
      } catch (ccaErr: any) {
        console.error(`[validate-contract] CCA Agent failed:`, ccaErr.message);

        // Gravar falha
        await supabase.from("contract_extractions").upsert({
          contrato_id: contract_id,
          source: "cca_agent",
          status: "failed",
          extraction_data: {},
          error_message: ccaErr.message,
          job_completed_at: new Date().toISOString(),
        }, { onConflict: "contrato_id,source" });

        await supabase.from("contratos").update({ validation_status: "failed" }).eq("id", contract_id);

        // Registar no audit log
        await supabase.from("audit_logs").insert({
          action: "cca_validation_failed",
          table_name: "contract_extractions",
          record_id: contract_id,
          user_id: "00000000-0000-0000-0000-000000000000",
          metadata: { error: ccaErr.message },
        }).catch(() => {});

        return new Response(
          JSON.stringify({ success: false, error: "Falha na validação CCA", details: ccaErr.message, fallback: "draft" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // === DESENVOLVIMENTO: Simulação (aceita draft como canonical) ===
      console.log(`[validate-contract] CCA_AGENT_URL not set, simulating validation`);
      canonicalResult = {
        extraction_canonical: extraction_draft,
        status: "validated",
        confidence: 85,
        review_notes: "Validação simulada — CCA Agent não configurado",
        evidence: [],
      };
    }

    // === CALCULAR DIFF ===
    const criticalFields = [
      'tipo_contrato', 'data_inicio_vigencia', 'data_termo',
      'tipo_renovacao', 'renovacao_periodo_meses',
      'aviso_previo_nao_renovacao_dias', 'prazos_denuncia_rescisao',
      'lei_aplicavel', 'foro_arbitragem',
      'tratamento_dados_pessoais', 'existe_dpa_anexo_rgpd',
      'transferencia_internacional', 'classificacao_juridica',
    ];

    const canonicalData = canonicalResult.extraction_canonical || {};
    const diff: Record<string, any> = {};

    for (const field of criticalFields) {
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
      classificacao_juridica: canonicalData.classificacao_juridica ?? null,
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
      foro_arbitragem: canonicalData.foro_arbitragem ?? null,
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
        old_data: { source: "ai_extraction", fields: Object.fromEntries(Object.entries(diff).map(([k, v]: [string, any]) => [k, v.draft])) },
        new_data: { source: "cca_agent", fields: Object.fromEntries(Object.entries(diff).map(([k, v]: [string, any]) => [k, v.canonical])) },
        metadata: { diff_count: Object.keys(diff).length, critical_fields: Object.keys(diff) },
      }).catch((e) => console.warn("Audit log insert failed:", e));
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[validate-contract] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
