import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContractAlert {
  id: string;
  titulo_contrato: string;
  parte_b_nome_legal: string;
  data_termo: string;
  tipo_renovacao: string;
  dias_para_expirar: number;
  responsavel_email: string | null;
  responsavel_nome: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in60Days = new Date(today);
    in60Days.setDate(in60Days.getDate() + 60);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);

    // Find contracts expiring in 30, 60, or 90 days
    const { data: contracts, error: contractsError } = await supabase
      .from("contratos")
      .select(`
        id,
        titulo_contrato,
        parte_b_nome_legal,
        data_termo,
        tipo_renovacao,
        alerta_renovacao_30_dias,
        alerta_renovacao_60_dias,
        alerta_renovacao_90_dias,
        responsavel_interno_id,
        profiles:responsavel_interno_id (
          email,
          nome_completo
        )
      `)
      .eq("estado_contrato", "activo")
      .not("data_termo", "is", null)
      .lte("data_termo", in90Days.toISOString().split("T")[0])
      .gte("data_termo", today.toISOString().split("T")[0]);

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      throw contractsError;
    }

    console.log(`Found ${contracts?.length || 0} contracts to check for alerts`);

    const alertsSent: string[] = [];
    const alertsToUpdate: { id: string; field: string }[] = [];

    for (const contract of contracts || []) {
      const termDate = new Date(contract.data_termo);
      const diffTime = termDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let shouldSendAlert = false;
      let alertType = "";
      let alertField = "";

      if (diffDays <= 30 && !contract.alerta_renovacao_30_dias) {
        shouldSendAlert = true;
        alertType = "30 dias";
        alertField = "alerta_renovacao_30_dias";
      } else if (diffDays <= 60 && diffDays > 30 && !contract.alerta_renovacao_60_dias) {
        shouldSendAlert = true;
        alertType = "60 dias";
        alertField = "alerta_renovacao_60_dias";
      } else if (diffDays <= 90 && diffDays > 60 && !contract.alerta_renovacao_90_dias) {
        shouldSendAlert = true;
        alertType = "90 dias";
        alertField = "alerta_renovacao_90_dias";
      }

      if (shouldSendAlert) {
        const profile = (contract.profiles as unknown as { email: string | null; nome_completo: string | null }[] | null)?.[0];
        const recipientEmail = profile?.email;
        
        // Create in-app notification with translation keys
        if (contract.responsavel_interno_id) {
          const { error: notifError } = await supabase
            .from("notifications")
            .insert({
              user_id: contract.responsavel_interno_id,
              organization_id: null, // Will be fetched from contract if needed
              type: `contract_expiry_${diffDays <= 30 ? '30' : diffDays <= 60 ? '60' : '90'}`,
              title: "notifications.contractExpiryTitle",
              message: contract.titulo_contrato,
              reference_type: 'contratos',
              reference_id: contract.id,
              metadata: { 
                days_to_expiry: diffDays, 
                data_termo: contract.data_termo,
                title_key: "notifications.contractExpiryTitle",
                title_params: { days: diffDays }
              }
            });
          
          if (notifError) {
            console.error(`Error creating notification for contract ${contract.id}:`, notifError);
          } else {
            console.log(`In-app notification created for contract ${contract.id}`);
          }
        }
        
        if (recipientEmail) {
          const renovacaoLabel = contract.tipo_renovacao === "renovacao_automatica" 
            ? "Renovação Automática" 
            : contract.tipo_renovacao === "renovacao_mediante_acordo"
            ? "Renovação Mediante Acordo"
            : "Sem Renovação Automática";

          try {
            const emailResponse = await resend.emails.send({
              from: "Legal Hub <onboarding@resend.dev>",
              to: [recipientEmail],
              subject: `⚠️ Alerta: Contrato expira em ${alertType} - ${contract.titulo_contrato}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a365d;">Alerta de Expiração de Contrato</h2>
                  <p>Olá ${profile?.nome_completo || ""},</p>
                  <p>O contrato abaixo expira em <strong>${alertType}</strong>:</p>
                  
                  <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Contrato:</strong> ${contract.titulo_contrato}</p>
                    <p><strong>Contraparte:</strong> ${contract.parte_b_nome_legal}</p>
                    <p><strong>Data de Termo:</strong> ${new Date(contract.data_termo).toLocaleDateString("pt-PT")}</p>
                    <p><strong>Tipo de Renovação:</strong> ${renovacaoLabel}</p>
                    <p><strong>Dias Restantes:</strong> ${diffDays} dias</p>
                  </div>
                  
                  <p>Por favor, reveja o contrato e tome as ações necessárias.</p>
                  
                  <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                    Este é um email automático do Legal Hub.
                  </p>
                </div>
              `,
            });

            console.log(`Email sent for contract ${contract.id}:`, emailResponse);
            alertsSent.push(contract.id);
            alertsToUpdate.push({ id: contract.id, field: alertField });
          } catch (emailError) {
            console.error(`Error sending email for contract ${contract.id}:`, emailError);
            // Still mark alert as sent since in-app notification was created
            alertsToUpdate.push({ id: contract.id, field: alertField });
          }
        } else {
          console.log(`No email found for contract ${contract.id}, marking alert as sent anyway`);
          alertsToUpdate.push({ id: contract.id, field: alertField });
        }
      }
    }

    // Update alert flags
    for (const alert of alertsToUpdate) {
      const { error: updateError } = await supabase
        .from("contratos")
        .update({ [alert.field]: true })
        .eq("id", alert.id);

      if (updateError) {
        console.error(`Error updating alert flag for contract ${alert.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsSent: alertsSent.length,
        contractsChecked: contracts?.length || 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contract-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
  }
});
