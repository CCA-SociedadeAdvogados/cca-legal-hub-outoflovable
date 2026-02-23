import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ContractTriageAnalysis {
  id: string;
  contrato_id: string;
  organization_id: string | null;
  analysis_id: string;
  analyzed_at: string;
  analyzed_by_id: string | null;
  text_source: string;
  text_length: number;
  file_name: string | null;
  score_global: number;
  nivel_risco_global: string;
  tipo_contrato: string | null;
  resumo_executivo: string | null;
  analises_clausulas: any[];
  red_flags_prioritarios: any[];
  recomendacoes_globais: string[];
  proximos_passos: string[];
  total_clausulas_analisadas: number;
  clausulas_conformes: number;
  clausulas_alto_risco: number;
  clausulas_criticas: number;
  raw_response: any;
  ai_model_used: string | null;
  created_at: string;
  updated_at: string;
}

export const useContractTriage = (contratoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['contract-triage', contratoId],
    queryFn: async () => {
      if (!contratoId) return null;
      
      const { data, error } = await supabase
        .from('contract_triage_analyses')
        .select('*')
        .eq('contrato_id', contratoId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ContractTriageAnalysis | null;
    },
    enabled: !!contratoId && !!user,
    staleTime: 0, // Always refetch to get latest data
    refetchOnWindowFocus: true,
  });

  const runTriage = useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.functions.invoke('triage-contract', {
        body: { contractId, saveResults: true }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na análise de triagem');
      
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch after invalidation
      await queryClient.invalidateQueries({ queryKey: ['contract-triage', contratoId] });
      await refetch();
      toast({ title: 'Análise de triagem concluída com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro na análise de triagem', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    analysis,
    isLoading,
    error,
    refetch,
    runTriage,
    isRunning: runTriage.isPending,
  };
};
