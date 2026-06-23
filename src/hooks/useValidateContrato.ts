import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

/**
 * Validação humana de um contrato (CCA): marca o contrato como `validated`,
 * tirando-o do estado "Provisório" (draft_only) sem depender da validação por IA.
 */
export function useValidateContrato() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contratoId: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ validation_status: 'validated', updated_by_id: user?.id })
        .eq('id', contratoId);
      if (error) throw error;
    },
    onSuccess: (_data, contratoId) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato', contratoId] });
      toast({ title: 'Contrato validado' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao validar', description: e.message, variant: 'destructive' });
    },
  });
}
