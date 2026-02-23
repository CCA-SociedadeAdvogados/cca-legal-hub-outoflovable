import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
export interface ComplianceEventVerified {
  evento_id: string;
  evento_titulo: string;
  area_direito: string;
  status_conformidade: 'conforme' | 'parcialmente_conforme' | 'nao_conforme' | 'nao_aplicavel';
  gaps_identificados: string[];
  recomendacoes: string[];
  clausulas_relevantes: string[];
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface ComplianceSummary {
  total_eventos: number;
  conformes: number;
  parcialmente_conformes: number;
  nao_conformes: number;
  nao_aplicaveis: number;
}

export interface ComplianceAnalysisResult {
  resumo_contrato: string;
  eventos_verificados: ComplianceEventVerified[];
  sumario_geral: ComplianceSummary;
  recomendacoes_gerais: string[];
  proximos_passos: string[];
  confianca: number;
}

export interface SavedComplianceAnalysis {
  id: string;
  contrato_id: string;
  organization_id: string | null;
  resumo_contrato: string | null;
  sumario_geral: ComplianceSummary;
  eventos_verificados: ComplianceEventVerified[];
  recomendacoes_gerais: string[] | null;
  proximos_passos: string[] | null;
  confianca: number | null;
  status_global: 'conforme' | 'parcialmente_conforme' | 'nao_conforme' | null;
  texto_analisado_hash: string | null;
  ai_model_used: string | null;
  created_at: string;
  created_by_id: string | null;
}

function calculateStatusGlobal(sumario: ComplianceSummary): 'conforme' | 'parcialmente_conforme' | 'nao_conforme' {
  if (sumario.nao_conformes > 0) return 'nao_conforme';
  if (sumario.parcialmente_conformes > 0) return 'parcialmente_conforme';
  return 'conforme';
}

export function useContractComplianceAnalysis(contratoId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['contract-compliance-analysis', contratoId];

  const { data: analysis, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<SavedComplianceAnalysis | null> => {
      if (!contratoId) return null;

      const { data, error } = await supabase
        .from('contract_compliance_analyses')
        .select('*')
        .eq('contrato_id', contratoId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching compliance analysis:', error);
        throw error;
      }

      if (!data) return null;

      // Parse JSONB fields with type assertions
      return {
        ...data,
        sumario_geral: data.sumario_geral as unknown as ComplianceSummary,
        eventos_verificados: data.eventos_verificados as unknown as ComplianceEventVerified[],
      } as SavedComplianceAnalysis;
    },
    enabled: !!contratoId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ 
      result, 
      organizationId, 
      aiModel 
    }: { 
      result: ComplianceAnalysisResult; 
      organizationId: string; 
      aiModel?: string;
    }) => {
      if (!contratoId) throw new Error('contratoId is required');

      const { data: { user } } = await supabase.auth.getUser();
      
      const statusGlobal = calculateStatusGlobal(result.sumario_geral);

      const payload = {
        contrato_id: contratoId,
        organization_id: organizationId,
        resumo_contrato: result.resumo_contrato,
        sumario_geral: result.sumario_geral as unknown as Json,
        eventos_verificados: result.eventos_verificados as unknown as Json,
        recomendacoes_gerais: result.recomendacoes_gerais,
        proximos_passos: result.proximos_passos,
        confianca: result.confianca,
        status_global: statusGlobal,
        ai_model_used: aiModel || null,
        created_by_id: user?.id || null,
      };

      // Check if analysis already exists
      const { data: existing } = await supabase
        .from('contract_compliance_analyses')
        .select('id')
        .eq('contrato_id', contratoId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('contract_compliance_analyses')
          .update(payload)
          .eq('contrato_id', contratoId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('contract_compliance_analyses')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Análise de conformidade guardada');
    },
    onError: (error: any) => {
      console.error('Error saving compliance analysis:', error);
      toast.error('Erro ao guardar análise de conformidade');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contratoId) throw new Error('contratoId is required');

      const { error } = await supabase
        .from('contract_compliance_analyses')
        .delete()
        .eq('contrato_id', contratoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Análise removida');
    },
    onError: (error: any) => {
      console.error('Error deleting compliance analysis:', error);
      toast.error('Erro ao remover análise');
    },
  });

  return {
    analysis,
    isLoading,
    error,
    saveAnalysis: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteAnalysis: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
