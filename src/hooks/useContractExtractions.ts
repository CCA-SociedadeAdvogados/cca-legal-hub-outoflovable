import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tipo flexível para dados extraídos
export interface ExtractionData {
  titulo_contrato?: string;
  tipo_contrato?: string;
  objeto_resumido?: string;
  lei_aplicavel?: string;
  foro_arbitragem?: string;
  lingua?: string;
  parte_a_nome_legal?: string;
  parte_a_nif?: string;
  parte_a_morada?: string;
  parte_b_nome_legal?: string;
  parte_b_nif?: string;
  parte_b_morada?: string;
  data_inicio_vigencia?: string;
  data_termo?: string;
  tipo_duracao?: string;
  tipo_renovacao?: string;
  renovacao_periodo_meses?: number;
  aviso_previo_nao_renovacao_dias?: number;
  prazos_denuncia_rescisao?: string;
  valor_total_estimado?: number;
  moeda?: string;
  prazo_pagamento_dias?: number;
  tratamento_dados_pessoais?: boolean;
  existe_dpa_anexo_rgpd?: boolean;
  transferencia_internacional?: boolean;
  paises_transferencia?: string;
  classificacao_juridica?: { tipo_principal: string; etiquetas: string[] };
  clausulas_importantes?: string[];
  riscos_identificados?: string[];
  confianca?: number;
  prazos_extraidos?: any;
  e_contrato_trabalho?: boolean;
  subtipo_contrato_trabalho?: string;
  [key: string]: any; // extensível
}

export type ValidationStatus = 'none' | 'draft_only' | 'validating' | 'validated' | 'needs_review' | 'failed';

export interface ContractExtraction {
  id: string;
  contrato_id: string;
  source: 'lovable_ai' | 'cca_agent';
  status: 'provisional' | 'validated' | 'needs_review' | 'failed';
  extraction_data: ExtractionData;
  confidence: number | null;
  evidence: any[];
  review_notes: string | null;
  diff_from_draft: Record<string, { draft: any; canonical: any }> | null;
  classificacao_juridica: any;
  prazos: any;
  denuncia_rescisao: any;
  lei_aplicavel: string | null;
  foro_arbitragem: string | null;
  rgpd_summary: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useContractExtractions(contratoId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: extractions, isLoading } = useQuery({
    queryKey: ['contract-extractions', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from('contract_extractions')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContractExtraction[];
    },
    enabled: !!user && !!contratoId,
  });

  const draft = extractions?.find(e => e.source === 'lovable_ai') || null;
  const canonical = extractions?.find(e => e.source === 'cca_agent') || null;
  const activeExtraction = (canonical && canonical.status !== 'failed') ? canonical : draft;

  const validationStatus: ValidationStatus =
    !draft && !canonical ? 'none' :
    canonical?.status === 'validated' ? 'validated' :
    canonical?.status === 'needs_review' ? 'needs_review' :
    canonical?.status === 'failed' ? 'failed' :
    canonical?.status === 'provisional' ? 'validating' :
    draft && !canonical ? 'draft_only' :
    'none';

  const saveDraft = useMutation({
    mutationFn: async (params: { extractionData: ExtractionData; confidence?: number; evidence?: any[] }) => {
      const payload: any = {
        contrato_id: contratoId,
        source: 'lovable_ai',
        status: 'provisional',
        extraction_data: params.extractionData,
        confidence: params.confidence ?? null,
        evidence: params.evidence ?? [],
        created_by_id: user?.id,
      };
      const { data, error } = await supabase
        .from('contract_extractions')
        .upsert(payload, { onConflict: 'contrato_id,source' })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('contratos').update({ validation_status: 'draft_only' } as any).eq('id', contratoId!);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-extractions', contratoId] });
    },
  });

  const triggerCCAValidation = useMutation({
    mutationFn: async (params?: { reuseExistingDraft?: boolean }) => {
      const draftData = params?.reuseExistingDraft && draft
        ? draft.extraction_data
        : activeExtraction?.extraction_data || {};

      await supabase.from('contratos').update({ validation_status: 'validating' } as any).eq('id', contratoId!);

      const { data, error } = await supabase.functions.invoke('validate-contract', {
        body: {
          contract_id: contratoId,
          extraction_draft: draftData,
          document_reference: null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-extractions', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: async () => {
      await supabase.from('contratos').update({ validation_status: 'failed' } as any).eq('id', contratoId!);
      queryClient.invalidateQueries({ queryKey: ['contract-extractions', contratoId] });
    },
  });

  return {
    draft,
    canonical,
    activeExtraction,
    validationStatus,
    extractions,
    isLoading,
    saveDraft,
    triggerCCAValidation,
  };
}
