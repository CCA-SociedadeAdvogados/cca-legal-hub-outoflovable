import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * notify-pedido-email
 *
 * Envia email imediato à equipa CCA quando um cliente abre um pedido
 * (on_demand_requests). Invocada pelo fluxo de criação no Portal
 * (fire-and-forget); o conteúdo do email vem sempre da base de dados,
 * nunca do corpo do pedido HTTP — o chamador só indica o pedido_id.
 *
 * Destinatários: organizations.lawyer_user_id quando atribuído; caso
 * contrário, todos os utilizadores CCA (membros da organização cca_owner).
 */

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: "Urgente",
  normal: "Normal",
  baixa: "Baixa",
};

const TIPO_LABEL: Record<string, string> = {
  conformidade: "Análise de Conformidade",
  revisao_clausulas: "Revisão de Cláusulas",
  due_diligence: "Due Diligence",
  outro: "Outro",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { pedido_id } = await req.json();
    if (typeof pedido_id !== "string" || !pedido_id) {
      return json({ error: "pedido_id é obrigatório" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Autenticação: aceitar service role ou um utilizador autenticado que
    // seja o solicitante do pedido (o Portal chama logo após criar).
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    let callerId: string | null = null;
    if (token !== serviceKey) {
      const { data: { user: caller } } = await supabase.auth.getUser(token);
      if (!caller) return json({ error: "Unauthorized" }, 401);
      callerId = caller.id;
    }

    // Conteúdo sempre a partir da BD — o chamador não controla o texto do email.
    const { data: pedido, error: pedidoErr } = await supabase
      .from("on_demand_requests")
      .select("id, organization_id, titulo, descricao, tipo_analise, prioridade, solicitado_por_id, created_at")
      .eq("id", pedido_id)
      .maybeSingle();
    if (pedidoErr) throw pedidoErr;
    if (!pedido) return json({ error: "Pedido não encontrado" }, 404);

    if (callerId && pedido.solicitado_por_id !== callerId) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name, lawyer_user_id")
      .eq("id", pedido.organization_id)
      .maybeSingle();

    // Destinatários: advogado responsável ou, em fallback, toda a equipa CCA.
    let recipientIds: string[] = [];
    if (org?.lawyer_user_id) {
      recipientIds = [org.lawyer_user_id];
    } else {
      const { data: ccaMembers } = await supabase
        .from("organization_members")
        .select("user_id, organizations!inner(org_type)")
        .eq("organizations.org_type", "cca_owner");
      recipientIds = (ccaMembers ?? []).map((m) => m.user_id);
    }
    if (recipientIds.length === 0) {
      return json({ success: true, emails_sent: 0, reason: "sem destinatários" });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("email")
      .in("id", recipientIds);
    const emails = [...new Set((profiles ?? []).map((p) => p.email).filter(Boolean))] as string[];
    if (emails.length === 0) {
      return json({ success: true, emails_sent: 0, reason: "sem emails" });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
    const resend = new Resend(RESEND_API_KEY);

    const urgente = pedido.prioridade === "urgente";
    const orgName = org?.name ?? "Cliente";
    const subject = `${urgente ? "[URGENTE] " : ""}Novo pedido de ${orgName}: ${pedido.titulo}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#1a1a1a;">
        <h2 style="color:#b8501e;">Novo pedido de cliente</h2>
        ${urgente ? '<p style="color:#c0392b; font-weight:bold;">⚠ Prioridade urgente</p>' : ""}
        <table style="border-collapse:collapse; line-height:1.8;">
          <tr><td style="padding-right:12px; color:#718096;">Cliente</td><td><strong>${escapeHtml(orgName)}</strong></td></tr>
          <tr><td style="padding-right:12px; color:#718096;">Assunto</td><td>${escapeHtml(pedido.titulo)}</td></tr>
          <tr><td style="padding-right:12px; color:#718096;">Tipo</td><td>${TIPO_LABEL[pedido.tipo_analise] ?? pedido.tipo_analise}</td></tr>
          <tr><td style="padding-right:12px; color:#718096;">Prioridade</td><td>${PRIORIDADE_LABEL[pedido.prioridade] ?? pedido.prioridade}</td></tr>
        </table>
        ${pedido.descricao ? `<p style="white-space:pre-wrap; border-left:3px solid #e2e8f0; padding-left:12px; color:#4a5568;">${escapeHtml(pedido.descricao)}</p>` : ""}
        <p style="margin-top:24px;">Responda na página <strong>Pedidos à CCA</strong> do cockpit.</p>
        <p style="color:#718096; font-size:12px; margin-top:30px;">
          Notificação automática do Portal CCA.
        </p>
      </div>`;

    let emailsSent = 0;
    for (const to of emails) {
      try {
        await resend.emails.send({
          from: "Portal CCA <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        });
        emailsSent++;
      } catch (e) {
        console.warn(
          `[notify-pedido-email] envio falhou (${to}):`,
          e instanceof Error ? e.message : e,
        );
      }
    }

    console.log(`[notify-pedido-email] pedido ${pedido.id}: ${emailsSent}/${emails.length} emails enviados`);
    return json({ success: true, emails_sent: emailsSent });
  } catch (error) {
    console.error("[notify-pedido-email] Error:", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
