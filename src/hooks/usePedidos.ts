import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import type { Tables } from '@/integrations/supabase/types';

export type Pedido = Tables<'on_demand_requests'>;

export type PedidoEstado = 'pendente' | 'em_analise' | 'concluido' | 'cancelado';
export type PedidoTipo = 'conformidade' | 'revisao_clausulas' | 'due_diligence' | 'outro';
export type PedidoPrioridade = 'urgente' | 'normal' | 'baixa';

export interface NovoPedido {
  titulo: string;
  descricao?: string | null;
  tipo_analise: PedidoTipo;
  prioridade: PedidoPrioridade;
  contrato_id?: string | null;
}

/**
 * Pedidos à CCA (ciclo fechado). Partilhado entre o Portal (cliente abre/segue)
 * e o cockpit (CCA responde). O RLS scopa por organização + utilizadores CCA.
 */
export function usePedidos(organizationId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organizationId ?? null;

  const {
    data: pedidos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.pedidos.byOrg(orgId ?? 'none'),
    enabled: !!orgId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Pedido[]> => {
      const { data, error } = await supabase
        .from('on_demand_requests')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.pedidos.byOrg(orgId ?? 'none') });

  // Cliente: abrir um pedido
  const createPedido = useMutation({
    mutationFn: async (input: NovoPedido) => {
      if (!user) throw new Error('Utilizador não autenticado');
      if (!orgId) throw new Error('Organização não definida');
      const { data, error } = await supabase
        .from('on_demand_requests')
        .insert({
          organization_id: orgId,
          solicitado_por_id: user.id,
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          tipo_analise: input.tipo_analise,
          prioridade: input.prioridade,
          contrato_id: input.contrato_id ?? null,
          estado: 'pendente',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Pedido enviado à CCA' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao enviar o pedido', description: e.message, variant: 'destructive' });
    },
  });

  // Cliente: cancelar o próprio pedido (enquanto não concluído)
  const cancelPedido = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('on_demand_requests')
        .update({ estado: 'cancelado' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Pedido cancelado' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao cancelar', description: e.message, variant: 'destructive' });
    },
  });

  // CCA: responder / mudar estado
  const respondPedido = useMutation({
    mutationFn: async ({
      id,
      resposta,
      estado,
    }: {
      id: string;
      resposta?: string;
      estado: PedidoEstado;
    }) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const patch: Partial<Pedido> = { estado, responsavel_id: user.id };
      if (resposta !== undefined) patch.resposta = resposta;
      const { error } = await supabase.from('on_demand_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Pedido atualizado' });
    },
    onError: (e: Error) => {
      toast({
        title: 'Erro ao atualizar o pedido',
        description: e.message,
        variant: 'destructive',
      });
    },
  });

  return { pedidos, isLoading, error, createPedido, cancelPedido, respondPedido };
}
