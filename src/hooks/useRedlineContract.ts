import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ClauseClassification = 'favoravel' | 'standard' | 'atencao' | 'risco';

export interface RedlineClause {
  titulo: string;
  texto_original: string;
  classificacao: ClauseClassification;
  justificacao: string;
  sugestao: string | null;
}

export interface RedlineData {
  score_geral: number;
  sumario: string;
  clausulas: RedlineClause[];
  pontos_positivos: string[];
  pontos_negativos: string[];
  recomendacoes_negociacao: string[];
}

export function useRedlineContract(contractId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: redline, isLoading } = useQuery({
    queryKey: ['redline', contractId],
    enabled: !!contractId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RedlineData | null> => {
      const { data, error } = await supabase
        .from('contract_extractions')
        .select('extraction_data')
        .eq('contrato_id', contractId!)
        .eq('source', 'redline')
        .maybeSingle();

      if (error) throw error;
      return (data?.extraction_data as unknown as RedlineData) ?? null;
    },
  });

  const analyze = useMutation<RedlineData, Error, boolean>({
    mutationFn: async (forceRegenerate: boolean = false) => {
      const { data, error } = await supabase.functions.invoke('redline-contract', {
        body: { contract_id: contractId, force_regenerate: forceRegenerate },
      });

      if (error) {
        let msg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch {
          /* use original */
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data.data as RedlineData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redline', contractId] });
      toast.success('Análise de cláusulas concluída');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro na análise de cláusulas');
    },
  });

  return { redline, isLoading, analyze };
}
