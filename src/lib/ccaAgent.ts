/**
 * ccaAgent.ts
 *
 * SEGURANÇA: Este ficheiro NÃO chama o Render directamente.
 * Todas as chamadas passam pela Edge Function 'validate-contract' no Supabase,
 * que é a única entidade com acesso à CCA_AGENT_KEY e ao URL do Render.
 *
 * Fluxo correcto:
 *   Browser → Edge Function (Supabase) → Agente CCA (Render)
 */

import { supabase } from '@/integrations/supabase/client';

export async function callCCAAgent({
  contractId,
  documentPath,
  extractionDraft,
}: {
  contractId: string;
  documentPath: string;
  extractionDraft: Record<string, unknown>;
}) {
  // Gera signed URL do documento se existir caminho — isto é seguro porque
  // usa a sessão do utilizador autenticado, não expõe chaves de serviço.
  let documentReference: string | undefined;
  if (documentPath) {
    const { data: signedData } = await supabase.storage
      .from('contracts')
      .createSignedUrl(documentPath, 3600);
    documentReference = signedData?.signedUrl;
  }

  // Chama a Edge Function 'validate-contract' no Supabase.
  // A CCA_AGENT_KEY e o URL do Render estão APENAS nos Secrets do Supabase —
  // nunca chegam ao browser.
  const { data, error } = await supabase.functions.invoke('validate-contract', {
    body: {
      contract_id: contractId,
      document_reference: documentReference ?? null,
      extraction_draft: extractionDraft,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Erro na validação CCA');
  }

  return data;
}
