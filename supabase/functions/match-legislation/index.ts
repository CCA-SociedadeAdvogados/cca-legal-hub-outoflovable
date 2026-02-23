import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const LOVABLE_API_URL = "https://api.lovable.dev/v1";

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { contrato_id } = await req.json();
    
    if (!contrato_id) {
      return new Response(
        JSON.stringify({ error: 'contrato_id is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch contract details
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('id, titulo_contrato, tipo_contrato, objeto_resumido, areas_direito_aplicaveis, tratamento_dados_pessoais, transferencia_internacional')
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contrato) {
      console.error('Contract fetch error:', contratoError);
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch available legal documents
    const { data: documents, error: docsError } = await supabase
      .rpc('search_legal_documents', { p_limit: 100 });

    if (docsError || !documents || documents.length === 0) {
      console.log('No legal documents available');
      return new Response(
        JSON.stringify({ matches: [], message: 'No legal documents available for matching' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
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
          canonical_url: fullDoc[0].canonical_url
        });
      }
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
    const docsListForAI = docsWithContent.map((d, i) => 
      `[${i}] ID: ${d.id}\nTítulo: ${d.title}\nFonte: ${d.source_key}\nExcerto: ${d.content_text?.slice(0, 500) || 'Sem conteúdo'}`
    ).join('\n\n');

    console.log(`Calling Lovable AI Gateway for contract ${contrato_id} with ${docsWithContent.length} documents`);

    // Call Lovable AI Gateway for matching
    const aiResponse = await fetch(`${LOVABLE_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `És um especialista em direito português. A tua tarefa é identificar quais documentos legais são relevantes para um determinado contrato.

Analisa o contrato e os documentos disponíveis. Retorna APENAS um array JSON com os IDs dos documentos relevantes e o motivo.

Formato de resposta obrigatório:
[
  {"id": "uuid-do-documento", "score": 0.9, "motivo": "Razão da relevância"}
]

Se nenhum documento for relevante, retorna: []

Não incluas explicações fora do JSON.`
          },
          {
            role: 'user',
            content: `CONTRATO:\n${contractContext}\n\nDOCUMENTOS DISPONÍVEIS:\n${docsListForAI}\n\nIdentifica os documentos relevantes para este contrato.`
          }
        ],
        max_completion_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', aiContent);

    // Parse AI response
    let matches: Array<{ id: string; score: number; motivo: string }> = [];
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Validate and filter matches
    const validDocIds = new Set(docsWithContent.map(d => d.id));
    matches = matches.filter(m => validDocIds.has(m.id));

    // Get auth user for created_by
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Save matches to database
    const savedMatches = [];
    for (const match of matches) {
      const { error: insertError } = await supabase
        .from('contrato_normativos')
        .upsert({
          contrato_id: contrato_id,
          documento_id: match.id,
          relevancia_score: Math.min(1, Math.max(0, match.score || 0.5)),
          motivo_associacao: match.motivo,
          tipo_associacao: 'automatico',
          created_by_id: userId
        }, {
          onConflict: 'contrato_id,documento_id'
        });

      if (!insertError) {
        const doc = docsWithContent.find(d => d.id === match.id);
        savedMatches.push({
          documento_id: match.id,
          titulo: doc?.title,
          fonte: doc?.source_key,
          url: doc?.canonical_url,
          score: match.score,
          motivo: match.motivo
        });
      }
    }

    console.log(`Matched ${savedMatches.length} documents to contract ${contrato_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: savedMatches,
        total_analyzed: docsWithContent.length
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Match legislation error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
