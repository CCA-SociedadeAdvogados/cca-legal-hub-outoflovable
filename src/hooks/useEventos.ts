import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type EventoCicloVida = Tables<'eventos_ciclo_vida_contrato'>;
export type EventoCicloVidaInsert = TablesInsert<'eventos_ciclo_vida_contrato'>;

export type TipoEvento = 
  | 'criacao'
  | 'assinatura'
  | 'inicio_vigencia'
  | 'renovacao'
  | 'adenda'
  | 'rescisao'
  | 'denuncia'
  | 'expiracao'
  | 'nota_interna'
  | 'alteracao';

export const useEventos = (contratoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: eventos, isLoading, error } = useQuery({
    queryKey: ['eventos', contratoId],
    queryFn: async () => {
      let query = supabase
        .from('eventos_ciclo_vida_contrato')
        .select('*')
        .order('data_evento', { ascending: false });
      
      if (contratoId) {
        query = query.eq('contrato_id', contratoId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createEvento = useMutation({
    mutationFn: async (evento: {
      contrato_id: string;
      tipo_evento: TipoEvento;
      descricao?: string;
      data_evento?: string;
    }) => {
      const { data, error } = await supabase
        .from('eventos_ciclo_vida_contrato')
        .insert([{
          contrato_id: evento.contrato_id,
          tipo_evento: evento.tipo_evento,
          descricao: evento.descricao,
          data_evento: evento.data_evento || new Date().toISOString().split('T')[0],
          criado_por_id: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventos', variables.contrato_id] });
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({ title: 'Evento registado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao registar evento', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    eventos,
    isLoading,
    error,
    createEvento,
  };
};
