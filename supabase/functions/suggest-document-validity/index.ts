import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Typical validity periods (in months) for Portuguese legal documents
const VALIDITY_RULES: Record<string, number> = {
  "certidão permanente": 12,
  "certidao permanente": 12,
  "permanent certificate": 12,
  "rcbe": 12,
  "registo central do beneficiário efetivo": 12,
  "documentos de identificação": 60,
  "documentos de identificacao": 60,
  "identification documents": 60,
  "comprovativo de morada": 3,
  "proof of address": 3,
  "certidão de não dívida at": 3,
  "certidao de nao divida at": 3,
  "tax compliance certificate": 3,
  "certidão de não dívida ss": 3,
  "certidao de nao divida ss": 3,
  "social security compliance": 3,
};

function suggestValidityMonths(documentName: string): number {
  const normalized = documentName.toLowerCase().trim();
  for (const [key, months] of Object.entries(VALIDITY_RULES)) {
    if (normalized.includes(key)) return months;
  }
  // Default: 12 months for unknown documents
  return 12;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // User client — for auth + access checks only
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service client — for DB writes that bypass RLS (CCA users are not org members)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { organization_id, checklist_type_id } = await req.json() as {
      organization_id: string;
      checklist_type_id: string;
    };

    if (!organization_id || !checklist_type_id) {
      return new Response(
        JSON.stringify({ error: "organization_id e checklist_type_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Verify user has access to this organization (member OR CCA internal)
    const { data: membership } = await supabaseUser
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: ccaUser } = await supabaseAdmin
      .from("cca_internal_users")
      .select("email")
      .eq("email", user.email!)
      .maybeSingle();

    if (!membership && !ccaUser) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch document type name (admin client to avoid RLS on lookup tables)
    const { data: docType, error: docTypeError } = await supabaseAdmin
      .from("document_checklist_types")
      .select("name, name_en")
      .eq("id", checklist_type_id)
      .maybeSingle();

    if (docTypeError || !docType) {
      return new Response(
        JSON.stringify({ error: "Tipo de documento não encontrado" }),
        { status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const typedDocType = docType as { name: string; name_en: string | null };
    const validityMonths = suggestValidityMonths(typedDocType.name);
    const suggestedDate = addMonths(new Date(), validityMonths);
    const suggestedDateStr = suggestedDate.toISOString().split("T")[0];

    // Upsert the suggested date — use admin client so CCA users can write to client orgs
    const { error: upsertError } = await supabaseAdmin
      .from("organization_document_checklist")
      .upsert(
        {
          organization_id,
          checklist_type_id,
          ai_suggested_date: suggestedDateStr,
          confirmed_by_user: false,
          updated_by_id: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,checklist_type_id" },
      );

    if (upsertError) {
      console.error("[suggest-document-validity] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erro ao guardar sugestão" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ai_suggested_date: suggestedDateStr,
        validity_months: validityMonths,
        document_name: typedDocType.name,
      }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[suggest-document-validity] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
