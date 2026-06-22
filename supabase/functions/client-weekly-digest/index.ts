import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * client-weekly-digest
 *
 * Envia a cada cliente um resumo semanal "o que mudou": novos documentos,
 * prazos a aproximarem-se (14 dias), pedidos respondidos e novidades recentes.
 * Só envia se houver conteúdo. Pensada para correr semanalmente via GitHub
 * Action (header x-cron-secret == NAV_SYNC_SECRET) ou service role.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const cronSecret = Deno.env.get("NAV_SYNC_SECRET");
    const provided = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authTok = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!((cronSecret && provided === cronSecret) || (serviceKey && authTok === serviceKey))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
    const resend = new Resend(RESEND_API_KEY);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey ?? "");
    const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("org_type", "client")
      .eq("is_active", true);

    let emailsSent = 0;
    let orgsWithContent = 0;

    for (const org of orgs ?? []) {
      // Destinatários: membros locais (clientes) da organização
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", org.id);
      const userIds = (members ?? []).map((m) => m.user_id);
      if (userIds.length === 0) continue;
      const { data: recipients } = await supabase
        .from("profiles")
        .select("email, nome_completo")
        .in("id", userIds)
        .eq("auth_method", "local");
      const emails = (recipients ?? []).map((r) => r.email).filter(Boolean) as string[];
      if (emails.length === 0) continue;

      // Novos documentos (7 dias)
      const { count: newDocs } = await supabase
        .from("sharepoint_documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("is_folder", false)
        .eq("is_deleted", false)
        .gte("synced_at", weekAgo);

      // Prazos a aproximarem-se (14 dias)
      const { data: contratos } = await supabase
        .from("contratos")
        .select("titulo_contrato, data_termo, data_limite_decisao_renovacao")
        .eq("organization_id", org.id)
        .eq("estado_contrato", "activo")
        .eq("arquivado", false);
      const prazos: string[] = [];
      for (const c of contratos ?? []) {
        for (const [d, label] of [
          [c.data_limite_decisao_renovacao, "decisão de renovação"],
          [c.data_termo, "termo"],
        ] as [string | null, string][]) {
          if (d) {
            const n = daysUntil(d);
            if (n >= 0 && n <= 14) prazos.push(`${c.titulo_contrato} — ${label} em ${n} dia(s)`);
          }
        }
      }

      // Pedidos respondidos (7 dias)
      const { data: pedidos } = await supabase
        .from("on_demand_requests")
        .select("titulo")
        .eq("organization_id", org.id)
        .eq("estado", "concluido")
        .gte("updated_at", weekAgo)
        .limit(10);

      const hasContent = (newDocs ?? 0) > 0 || prazos.length > 0 || (pedidos ?? []).length > 0;
      if (!hasContent) continue;
      orgsWithContent++;

      const sections: string[] = [];
      if ((newDocs ?? 0) > 0)
        sections.push(`<li><strong>${newDocs}</strong> novo(s) documento(s) no seu arquivo</li>`);
      if (prazos.length > 0)
        sections.push(
          `<li><strong>Prazos a aproximarem-se:</strong><ul>${prazos
            .slice(0, 8)
            .map((p) => `<li>${p}</li>`)
            .join("")}</ul></li>`,
        );
      if ((pedidos ?? []).length > 0)
        sections.push(
          `<li><strong>${pedidos!.length}</strong> pedido(s) respondido(s) pela CCA</li>`,
        );

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#1a1a1a;">
          <h2 style="color:#b8501e;">O que mudou esta semana</h2>
          <p>Resumo da atividade do portal de <strong>${org.name}</strong>:</p>
          <ul style="line-height:1.6;">${sections.join("")}</ul>
          <p style="margin-top:24px;">Aceda ao portal para ver os detalhes.</p>
          <p style="color:#718096; font-size:12px; margin-top:30px;">
            Resumo semanal automático do Portal CCA. Para deixar de receber, contacte a equipa da CCA.
          </p>
        </div>`;

      for (const to of emails) {
        try {
          await resend.emails.send({
            from: "Portal CCA <onboarding@resend.dev>",
            to: [to],
            subject: "O que mudou esta semana no seu Portal CCA",
            html,
          });
          emailsSent++;
        } catch (e) {
          console.warn(`[client-weekly-digest] envio falhou (${to}):`, e instanceof Error ? e.message : e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, orgs_with_content: orgsWithContent, emails_sent: emailsSent }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[client-weekly-digest] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
