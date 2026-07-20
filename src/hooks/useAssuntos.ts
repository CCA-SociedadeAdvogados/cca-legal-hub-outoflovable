import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import type { Tables } from '@/integrations/supabase/types';

export type Assunto = Tables<'assuntos'>;
export type AssuntoEvento = Tables<'assunto_eventos'>;

export type AssuntoEstado = 'aberto' | 'em_curso' | 'aguarda_cliente' | 'concluido' | 'suspenso';
export type AssuntoTipo =
  | 'contencioso'
  | 'consultoria'
  | 'transacao'
  | 'due_diligence'
  | 'registo'
  | 'outro';
export type EventoTipo = 'marco' | 'atualizacao' | 'documento' | 'decisao' | 'outro';

export interface NovoAssunto {
  titulo: string;
  tipo: AssuntoTipo;
  descricao?: string | null;
  referencia?: string | null;
  data_prevista_conclusao?: string | null;
}

export interface NovoEvento {
  assunto_id: string;
  organization_id: string;
  titulo: string;
  descricao?: string | null;
  tipo: EventoTipo;
  data?: string | null;
  visivel_cliente: boolean;
}

/**
 * Assuntos/processos: partilhado entre o cockpit (CCA cria/atualiza) e o portal
 * (cliente vê). RLS: cliente lê a sua org; CCA/admin gere.
 */
export function useAssuntos(organizationId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organizationId ?? null;

  const { data: assuntos = [], isLoading } = useQuery({
    queryKey: queryKeys.assuntos.byOrg(orgId ?? 'none'),
    enabled: !!orgId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Assunto[]> => {
      const { data, error } = await supabase
        .from('assuntos')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.assuntos.byOrg(orgId ?? 'none') });

  const createAssunto = useMutation({
    mutationFn: async (input: NovoAssunto) => {
      if (!user) throw new Error('Utilizador não autenticado');
      if (!orgId) throw new Error('Organização não definida');
      const { data, error } = await supabase
        .from('assuntos')
        .insert({
          organization_id: orgId,
          titulo: input.titulo,
          tipo: input.tipo,
          descricao: input.descricao ?? null,
          referencia: input.referencia ?? null,
          data_prevista_conclusao: input.data_prevista_conclusao ?? null,
          created_by_id: user.id,
          updated_by_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Assunto criado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao criar assunto', description: e.message, variant: 'destructive' }),
  });

  const updateAssunto = useMutation({
    mutationFn: async ({ id, estado, ...rest }: Partial<Assunto> & { id: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const patch: Partial<Assunto> = { ...rest, updated_by_id: user.id };
      if (estado) {
        patch.estado = estado;
        if (estado === 'concluido') patch.data_conclusao = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from('assuntos').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Assunto atualizado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  // Escreve na base única de eventos do hub (blueprint, Secção 4.1: marcos
  // manuais publicam na criação quando visíveis ao cliente).
  const addEvento = useMutation({
    mutationFn: async (input: NovoEvento) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const data = input.data ?? new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('hub_eventos').insert({
        assunto_id: input.assunto_id,
        organization_id: input.organization_id,
        tipo: input.tipo === 'documento' ? 'evento_documental' : 'marco_manual',
        titulo_cliente: input.titulo,
        titulo_interno: input.titulo,
        descricao_cliente: input.visivel_cliente ? (input.descricao ?? null) : null,
        descricao_interna: input.descricao ?? null,
        data_evento: data,
        concluido: data <= new Date().toISOString().slice(0, 10),
        publicado: input.visivel_cliente,
        origem: 'manual',
        created_by_id: user.id,
        updated_by_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['hub-eventos', vars.organization_id] });
      toast({ title: 'Atualização adicionada' });
    },
    onError: (e: Error) =>
      toast({
        title: 'Erro ao adicionar atualização',
        description: e.message,
        variant: 'destructive',
      }),
  });

  return { assuntos, isLoading, createAssunto, updateAssunto, addEvento };
}

// A linha temporal de cada assunto vive agora na base única de eventos do
// hub: cockpit lê hub_eventos (useHubEventos), portal lê o RPC
// hub_client_timeline (useHubClientTimeline) — ver src/hooks/useHub.ts.
