import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Timelines de processos (docs/timelines/feature-timelines-brief.md).
 *
 * Segurança na camada de dados:
 *  - Advogados (membros da org CCA): acesso às tabelas tl_* via RLS e ao RPC
 *    tl_lawyer_timeline (inclui prazos, base legal e notas internas).
 *  - Clientes (papéis org): o ÚNICO caminho de leitura são os RPCs
 *    tl_client_timeline / tl_client_instances, que por construção não
 *    devolvem nenhuma coluna de prazo/data.
 *
 */

export type TlEstado = 'pendente' | 'ativa' | 'concluida';
export type TlTipo = 'gatilho' | 'prazo_parte' | 'prazo_tribunal' | 'marco';

export interface TlTemplate {
  id: string;
  key: string;
  title: string;
  area: string | null;
  jurisdicao: string | null;
  base_legal: string | null;
  versao: string | null;
}

export interface TlInstance {
  id: string;
  template_id: string;
  matter_ref: string | null;
  org_id: string;
  gatilho_data: string | null;
  urgente: boolean;
  created_at: string;
  tl_templates: Pick<TlTemplate, 'key' | 'title'> | null;
}

/** Linha devolvida por tl_lawyer_timeline — inclui campos internos. */
export interface TlLawyerPhase {
  instance_phase_id: string;
  ordem: number;
  label: string;
  tipo: TlTipo;
  base_legal: string | null;
  estado: TlEstado;
  prazo_calculado: string | null;
  data_conclusao: string | null;
  is_optional: boolean;
  confirmar: boolean;
  notas: string | null;
}

/** Linha devolvida por tl_client_timeline — apenas campos seguros. */
export interface TlClientPhase {
  ordem: number;
  label: string;
  tipo: TlTipo;
  estado: Extract<TlEstado, 'ativa' | 'concluida'>;
}

/** Linha devolvida por tl_client_instances — sem qualquer data. */
export interface TlClientInstance {
  instance_id: string;
  matter_ref: string | null;
  template_key: string;
  template_title: string;
}

// ── Advogado (cockpit CCA) ───────────────────────────────────

export function useTlTemplates() {
  return useQuery({
    queryKey: queryKeys.timelines.templates(),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TlTemplate[]> => {
      const { data, error } = await supabase.from('tl_templates').select('*').order('title');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTlInstances(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.timelines.instancesByOrg(organizationId ?? 'none'),
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<TlInstance[]> => {
      const { data, error } = await supabase
        .from('tl_instances')
        .select(
          'id, template_id, matter_ref, org_id, gatilho_data, urgente, created_at, tl_templates(key, title)',
        )
        .eq('org_id', organizationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface NovaTlInstance {
  template_id: string;
  org_id: string;
  matter_ref?: string | null;
  gatilho_data?: string | null;
  urgente?: boolean;
}

/** Cria a instância e inicializa todas as fases do template como 'pendente'. */
export function useCreateTlInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovaTlInstance): Promise<string> => {
      const { data: instance, error } = await supabase
        .from('tl_instances')
        .insert({
          template_id: input.template_id,
          org_id: input.org_id,
          matter_ref: input.matter_ref ?? null,
          gatilho_data: input.gatilho_data ?? null,
          urgente: input.urgente ?? false,
        })
        .select('id')
        .single();
      if (error) throw error;

      const { data: phases, error: phasesError } = await supabase
        .from('tl_phases')
        .select('id')
        .eq('template_id', input.template_id);
      if (phasesError) throw phasesError;

      if (phases?.length) {
        const { error: insertError } = await supabase
          .from('tl_instance_phases')
          .insert(
            phases.map((p: { id: string }) => ({ instance_id: instance.id, phase_id: p.id })),
          );
        if (insertError) throw insertError;
      }
      return instance.id as string;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.timelines.instancesByOrg(vars.org_id),
      });
      toast({ title: 'Timeline criada' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao criar timeline', description: e.message, variant: 'destructive' }),
  });
}

export function useLawyerTimeline(instanceId: string | null) {
  return useQuery({
    queryKey: queryKeys.timelines.lawyer(instanceId ?? 'none'),
    enabled: !!instanceId,
    staleTime: 15 * 1000,
    queryFn: async (): Promise<TlLawyerPhase[]> => {
      const { data, error } = await supabase.rpc('tl_lawyer_timeline', { p_instance: instanceId });
      if (error) throw error;
      return (data ?? []) as TlLawyerPhase[];
    },
  });
}

export function useSetTlPhase(instanceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instancePhaseId,
      estado,
    }: {
      instancePhaseId: string;
      estado: TlEstado;
    }) => {
      const { error } = await supabase.rpc('tl_set_phase', {
        p_instance_phase: instancePhaseId,
        p_estado: estado,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (instanceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.timelines.lawyer(instanceId) });
      }
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar fase', description: e.message, variant: 'destructive' }),
  });
}

// ── Cliente (portal) ─────────────────────────────────────────

export function useTlClientInstances() {
  return useQuery({
    queryKey: queryKeys.timelines.clientInstances(),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TlClientInstance[]> => {
      const { data, error } = await supabase.rpc('tl_client_instances');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientTimeline(instanceId: string | null) {
  return useQuery({
    queryKey: queryKeys.timelines.client(instanceId ?? 'none'),
    enabled: !!instanceId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TlClientPhase[]> => {
      const { data, error } = await supabase.rpc('tl_client_timeline', { p_instance: instanceId });
      if (error) throw error;
      return (data ?? []) as TlClientPhase[];
    },
  });
}
