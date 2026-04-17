import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

interface ContractData {
  id: string;
  titulo_contrato: string;
  tipo_contrato: string;
  objeto_resumido: string | null;
  areas_direito_aplicaveis: string[] | null;
  tratamento_dados_pessoais: boolean;
  transferencia_internacional: boolean;
}

interface LegalDocument {
  id: string;
  title: string;
  source_key: string;
  doc_type: string;
  content_text: string | null;
  canonical_url: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface MatchResult {
  matches: Array<{
    documento_id: string;
    titulo?: string;
    fonte?: string;
    url?: string;
    score: number;
    motivo: string;
  }>;
  total_analyzed: number;
}

/**
 * Core single-contract matching logic.
 * Used both by the direct single-contract endpoint and the org-wide loop.
 */
async function matchSingleContract(
  supabase: SupabaseClient,
  contractId: string,
  authUserId: string | null,
): Promise<MatchResult> {
  // Fetch contract details
  const { data: contrato, error: contratoError } = await supabase
    .from('contratos')
    .select('id, titulo_contrato, tipo_contrato, objeto_resumido, areas_direito_aplicaveis, tratamento_dados_pessoais, transferencia_internacional')
    .eq('id', contractId)
    .single();

  if (contratoError || !contrato) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  // Fetch available legal documents
  const { data: documents, error: docsError } = await supabase
    .rpc('search_legal_documents', { p_limit: 100 });

  if (docsError || !documents || documents.length === 0) {
    return { matches: [], total_analyzed: 0 };
  }

  // Get content for top documents
  const docsWithContent: LegalDocument[] = [];
  for (const doc of documents.slice(0, 30)) {
    const { data: fullDoc } = await supabase.rpc('get_legal_document', { p_id: doc.id });
    if (fullDoc && fullDoc[0]) {
      docsWithContent.push({
        id: fullDoc[0].id,
        title: fullDoc[0].title || doc.canonical_url,
        source_key: fullDoc[0].source_key,
        doc_type: fullDoc[0].doc_type,
        content_text: fullDoc[0].content_text?.slice(0, 2000) || null,
        canonical_url: fullDoc[0].canonical_url,
      });
    }
  }

  if (docsWithContent.length === 0) {
    return { matches: [], total_analyzed: 0 };
  }

  // Build contract context
  const contractContext = `
Contrato: ${contrato.titulo_contrato}
Tipo: ${contrato.tipo_contrato}
Objeto: ${contrato.objeto_resumido || 'Não especificado'}
Áreas de Direito: ${contrato.areas_direito_aplicaveis?.join(', ') || 'Não especificado'}
Trata Dados Pessoais: ${contrato.tratamento_dados_pessoais ? 'Sim' : 'Não'}
Transferência Internacional: ${contrato.transferencia_internacional ? 'Sim' : 'Não'}
  `.trim();

  // Build documents list
  const docsListForAI = docsWithContent
    .map(
      (d, i) =>
        `[${i}] ID: ${d.id}\nTítulo: ${d.title}\nFonte: ${d.source_key}\nExcerto: ${
          d.content_text?.slice(0, 500) || 'Sem conteúdo'
        }`,
    )
    .join('\n\n');

  console.log(`Calling Anthropic API for contract ${contractId} with ${docsWithContent.length} documents`);

  const systemPrompt = `És um especialista em direito português. A tua tarefa é identificar quais documentos legais são relevantes para um determinado contrato.

Analisa o contrato e os documentos disponíveis. Retorna APENAS um array JSON com os IDs dos documentos relevantes e o motivo.

Formato de resposta obrigatório:
[
  {"id": "uuid-do-documento", "score": 0.9, "motivo": "Razão da relevância"}
]

Se nenhum documento for relevante, retorna: []

Não incluas explicações fora do JSON.`;

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `CONTRATO:\n${contractContext}\n\nDOCUMENTOS DISPONÍVEIS:\n${docsListForAI}\n\nIdentifica os documentos relevantes para este contrato.`,
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('AI API error:', aiResponse.status, errorText);
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const aiContent = aiData.content?.[0]?.text || '[]';

  console.log('AI response:', aiContent);

  // Parse AI response
  let aiMatches: Array<{ id: string; score: number; motivo: string }> = [];
  try {
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      aiMatches = JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
  }

  // Validate and filter matches
  const validDocIds = new Set(docsWithContent.map((d) => d.id));
  aiMatches = aiMatches.filter((m) => validDocIds.has(m.id));

  // Save matches to database
  const savedMatches: MatchResult['matches'] = [];
  for (const match of aiMatches) {
    const { error: insertError } = await supabase
      .from('contrato_normativos')
      .upsert(
        {
          contrato_id: contractId,
          documento_id: match.id,
          relevancia_score: Math.min(1, Math.max(0, match.score || 0.5)),
          motivo_associacao: match.motivo,
          tipo_associacao: 'automatico',
          created_by_id: authUserId,
        },
        { onConflict: 'contrato_id,documento_id' },
      );

    if (!insertError) {
      const doc = docsWithContent.find((d) => d.id === match.id);
      savedMatches.push({
        documento_id: match.id,
        titulo: doc?.title,
        fonte: doc?.source_key,
        url: doc?.canonical_url,
        score: match.score,
        motivo: match.motivo,
      });
    }
  }

  console.log(`Matched ${savedMatches.length} documents to contract ${contractId}`);

  return { matches: savedMatches, total_analyzed: docsWithContent.length };
}

/**
 * Resolves the authenticated user ID from the Authorization header.
 */
async function resolveUserId(supabase: SupabaseClient, req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const body = await req.json();
    const { contrato_id, organization_id, event_id } = body;

    if (!contrato_id && !organization_id) {
      return new Response(
        JSON.stringify({ error: 'contrato_id or organization_id is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userId = await resolveUserId(supabase, req);

    // ── Org-wide matching mode ──────────────────────────────
    if (organization_id && !contrato_id) {
      console.log(
        `[org-wide] Matching legislation for org ${organization_id}, event ${event_id ?? 'all'}`,
      );

      const { data: activeContracts, error: contractsError } = await supabase
        .from('contratos')
        .select('id, titulo_contrato')
        .eq('organization_id', organization_id)
        .eq('estado_contrato', 'activo')
        .eq('arquivado', false);

      if (contractsError) {
        console.error('Error fetching active contracts:', contractsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch active contracts' }),
          { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }

      if (!activeContracts || activeContracts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No active contracts to match', results: [] }),
          { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }

      console.log(`[org-wide] Found ${activeContracts.length} active contracts`);

      const results: Array<{
        contrato_id: string;
        titulo: string;
        matches: number;
        error?: string;
      }> = [];

      for (const contract of activeContracts) {
        try {
          const singleResult = await matchSingleContract(supabase, contract.id, userId);
          results.push({
            contrato_id: contract.id,
            titulo: contract.titulo_contrato,
            matches: singleResult.matches?.length ?? 0,
          });
        } catch (err) {
          console.warn(`[org-wide] Failed for contract ${contract.id}:`, err);
          results.push({
            contrato_id: contract.id,
            titulo: contract.titulo_contrato,
            matches: 0,
            error: String(err),
          });
        }
      }

      // Create notifications for contracts that got matches
      const affectedContracts = results.filter((r) => r.matches > 0);
      if (affectedContracts.length > 0) {
        const { data: members } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organization_id);

        if (members && members.length > 0) {
          const notifications = members.flatMap((member: { user_id: string }) =>
            affectedContracts.map((contract) => ({
              user_id: member.user_id,
              organization_id,
              type: 'legislation_match',
              title: 'Legislação relevante detetada',
              message: `Foram encontradas ${contract.matches} norma(s) relevante(s) para o contrato "${contract.titulo}".`,
              reference_type: 'contrato',
              reference_id: contract.contrato_id,
            })),
          );

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.warn('[org-wide] Failed to create notifications:', notifError);
          }
        }
      }

      console.log(
        `[org-wide] Completed. ${affectedContracts.length}/${activeContracts.length} contracts had matches.`,
      );

      return new Response(
        JSON.stringify({ success: true, results, total_contracts: activeContracts.length }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // ── Single-contract matching mode ───────────────────────
    try {
      const result = await matchSingleContract(supabase, contrato_id, userId);

      return new Response(
        JSON.stringify({
          success: true,
          matches: result.matches,
          total_analyzed: result.total_analyzed,
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      const message = String(err);
      if (message.includes('Contract not found')) {
        return new Response(JSON.stringify({ error: 'Contract not found' }), {
          status: 404,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      if (message.includes('Rate limit') || message.includes('429')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('Match legislation error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
