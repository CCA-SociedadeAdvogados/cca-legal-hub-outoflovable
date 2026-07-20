import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Hub CCA — base única de eventos, configuração do portal, grupos de acesso
 * e auditoria (docs/hub/blueprint-implementacao.md).
 *
 * Segurança na camada de dados (Secção 4 do blueprint):
 *  - CCA: acesso total a hub_eventos via RLS (curadoria na consola).
 *  - Clientes: SEM select direto — o único caminho são os RPCs
 *    hub_client_timeline / hub_client_prazos, que nunca devolvem as
 *    colunas internas (titulo_interno, descricao_interna, interno, …) e o
 *    estado vem sempre calculado no servidor.
 */

export type HubEvento = Tables<'hub_eventos'>;
export type HubGrupo = Tables<'hub_grupos'>;
export type HubPortalConfig = Tables<'hub_portal_config'>;

export type HubTipoEvento =
  | 'marco_fase'
  | 'prazo_processual'
  | 'audiencia'
  | 'data_contratual'
  | 'marco_manual'
  | 'evento_documental';

export type HubEstadoEvento = 'concluido' | 'em_curso' | 'previsto' | 'vencido';

export const HUB_TIPOS_EVENTO: HubTipoEvento[] = [
  'marco_fase',
  'prazo_processual',
  'audiencia',
  'data_contratual',
  'marco_manual',
  'evento_documental',
];

/** Abas do portal geríveis na consola (nível 1 do modelo de permissões). */
export const PORTAL_ABAS = [
  'contratos',
  'assuntos',
  'timelines',
  'documentos',
  'prazos',
  'financeiro',
  'pedidos',
  'novidades',
  'politicas',
] as const;
export type PortalAba = (typeof PORTAL_ABAS)[number];

export const PORTAL_FUNCIONALIDADES = [
  'ics',
  'upload_documentos',
  'ocultar_valores',
  'assistente',
] as const;
export type PortalFuncionalidade = (typeof PORTAL_FUNCIONALIDADES)[number];

const ABAS_DEFAULT: Record<PortalAba, boolean> = {
  contratos: true,
  assuntos: true,
  timelines: true,
  documentos: true,
  prazos: true,
  financeiro: true,
  pedidos: true,
  novidades: true,
  politicas: true,
};
const FUNCIONALIDADES_DEFAULT: Record<PortalFuncionalidade, boolean> = {
  ics: true,
  upload_documentos: true,
  ocultar_valores: false,
  assistente: true,
};

export interface HubClientEvento {
  evento_id: string;
  tipo: HubTipoEvento;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  estado: HubEstadoEvento;
  requer_acao_cliente: boolean;
}

export interface HubClientPrazo extends HubClientEvento {
  assunto_id: string | null;
  assunto_titulo: string | null;
}

// ── Cliente (portal): único caminho de leitura ───────────────

export function useHubClientTimeline(assuntoId: string | null) {
  return useQuery({
    queryKey: queryKeys.hub.clientTimeline(assuntoId ?? 'none'),
    enabled: !!assuntoId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<HubClientEvento[]> => {
      const { data, error } = await supabase.rpc('hub_client_timeline', {
        p_assunto: assuntoId!,
      });
      if (error) throw error;
      return (data ?? []) as HubClientEvento[];
    },
  });
}

export function useHubClientPrazos() {
  return useQuery({
    queryKey: queryKeys.hub.clientPrazos(),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<HubClientPrazo[]> => {
      const { data, error } = await supabase.rpc('hub_client_prazos');
      if (error) throw error;
      return (data ?? []) as HubClientPrazo[];
    },
  });
}

// ── Configuração do portal (consola nível 1) ─────────────────

export interface PortalConfigResolvida {
  abas: Record<PortalAba, boolean>;
  funcionalidades: Record<PortalFuncionalidade, boolean>;
}

/** Configuração da org com fallback para os defaults (sem linha = tudo ativo). */
export function useHubPortalConfig(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.hub.portalConfig(organizationId ?? 'none'),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PortalConfigResolvida> => {
      const { data, error } = await supabase
        .from('hub_portal_config')
        .select('abas, funcionalidades')
        .eq('organization_id', organizationId!)
        .maybeSingle();
      if (error) throw error;
      return {
        abas: { ...ABAS_DEFAULT, ...((data?.abas as Record<string, boolean>) ?? {}) },
        funcionalidades: {
          ...FUNCIONALIDADES_DEFAULT,
          ...((data?.funcionalidades as Record<string, boolean>) ?? {}),
        },
      };
    },
  });
}

export function useUpdateHubPortalConfig(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PortalConfigResolvida>) => {
      if (!organizationId || !user) throw new Error('Organização não definida');
      const { data: atual } = await supabase
        .from('hub_portal_config')
        .select('abas, funcionalidades')
        .eq('organization_id', organizationId)
        .maybeSingle();
      const { error } = await supabase.from('hub_portal_config').upsert({
        organization_id: organizationId,
        abas: { ...ABAS_DEFAULT, ...((atual?.abas as object) ?? {}), ...(patch.abas ?? {}) },
        funcionalidades: {
          ...FUNCIONALIDADES_DEFAULT,
          ...((atual?.funcionalidades as object) ?? {}),
          ...(patch.funcionalidades ?? {}),
        },
        updated_by_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.hub.portalConfig(organizationId ?? 'none'),
      });
      toast({ title: 'Configuração guardada' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao guardar', description: e.message, variant: 'destructive' }),
  });
}

// ── Eventos (CCA: curadoria) ─────────────────────────────────

export function useHubEventos(organizationId: string | null, assuntoId?: string | null) {
  return useQuery({
    queryKey: queryKeys.hub.eventos(organizationId ?? 'none', assuntoId),
    enabled: !!organizationId,
    staleTime: 15 * 1000,
    queryFn: async (): Promise<HubEvento[]> => {
      let query = supabase
        .from('hub_eventos')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('data_evento', { ascending: false })
        .order('created_at', { ascending: false });
      if (assuntoId) query = query.eq('assunto_id', assuntoId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface NovoHubEvento {
  organization_id: string;
  assunto_id?: string | null;
  tipo: HubTipoEvento;
  titulo_cliente: string;
  titulo_interno?: string | null;
  descricao_cliente?: string | null;
  descricao_interna?: string | null;
  data_evento: string;
  concluido?: boolean;
  interno?: boolean;
  publicado?: boolean;
  requer_acao_cliente?: boolean;
}

export function useCreateHubEvento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoHubEvento) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const { error } = await supabase.from('hub_eventos').insert({
        ...input,
        origem: 'manual',
        created_by_id: user.id,
        updated_by_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hub-eventos', vars.organization_id] });
      toast({ title: 'Evento criado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao criar evento', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateHubEvento(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<HubEvento> & { id: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const { error } = await supabase
        .from('hub_eventos')
        .update({ ...patch, updated_by_id: user.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-eventos', organizationId] });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar evento', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteHubEvento(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hub_eventos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-eventos', organizationId] });
      toast({ title: 'Evento removido' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao remover evento', description: e.message, variant: 'destructive' }),
  });
}

/** Semântica de estado — espelho local de hub_estado_evento (para vistas CCA). */
export function hubEstadoEvento(dataEvento: string, concluido: boolean): HubEstadoEvento {
  if (concluido) return 'concluido';
  const hoje = new Date().toISOString().slice(0, 10);
  if (dataEvento < hoje) return 'vencido';
  if (dataEvento === hoje) return 'em_curso';
  return 'previsto';
}

// ── Grupos de acesso (F1) ────────────────────────────────────

export interface HubGrupoComEmpresas extends HubGrupo {
  organizations: Array<{
    id: string;
    name: string;
    client_code: string | null;
    portal_ativa: boolean;
  }>;
}

export function useHubGrupos() {
  return useQuery({
    queryKey: queryKeys.hub.grupos(),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<HubGrupoComEmpresas[]> => {
      const { data, error } = await supabase
        .from('hub_grupos')
        .select('*, organizations(id, name, client_code, portal_ativa)')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as HubGrupoComEmpresas[];
    },
  });
}

export function useHubGrupoMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hub.grupos() });
    queryClient.invalidateQueries({ queryKey: ['cca-all-organizations'] });
  };

  const criarGrupo = useMutation({
    mutationFn: async (nome: string): Promise<string> => {
      const { data, error } = await supabase
        .from('hub_grupos')
        .insert({ nome, created_by_id: user?.id })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Grupo criado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao criar grupo', description: e.message, variant: 'destructive' }),
  });

  const associarEmpresa = useMutation({
    mutationFn: async ({ orgId, grupoId }: { orgId: string; grupoId: string | null }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ hub_grupo_id: grupoId })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      toast({ title: 'Erro ao associar empresa', description: e.message, variant: 'destructive' }),
  });

  const setPortalAtiva = useMutation({
    mutationFn: async ({ orgId, ativa }: { orgId: string; ativa: boolean }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ portal_ativa: ativa })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar empresa', description: e.message, variant: 'destructive' }),
  });

  return { criarGrupo, associarEmpresa, setPortalAtiva };
}

// ── Acesso restrito por assunto (nível 4) ────────────────────

export function useHubUserAssuntos(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.hub.userAssuntos(organizationId ?? 'none'),
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_user_assuntos')
        .select('user_id, assunto_id');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHubUserAssuntoMutations(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.hub.userAssuntos(organizationId ?? 'none'),
    });

  const designar = useMutation({
    mutationFn: async ({ userId, assuntoId }: { userId: string; assuntoId: string }) => {
      const { error } = await supabase
        .from('hub_user_assuntos')
        .insert({ user_id: userId, assunto_id: assuntoId, created_by_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      toast({ title: 'Erro ao designar assunto', description: e.message, variant: 'destructive' }),
  });

  const remover = useMutation({
    mutationFn: async ({ userId, assuntoId }: { userId: string; assuntoId: string }) => {
      const { error } = await supabase
        .from('hub_user_assuntos')
        .delete()
        .eq('user_id', userId)
        .eq('assunto_id', assuntoId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  const setAcessoRestrito = useMutation({
    mutationFn: async ({
      userId,
      orgId,
      restrito,
    }: {
      userId: string;
      orgId: string;
      restrito: boolean;
    }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ acesso_restrito: restrito })
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar acesso', description: e.message, variant: 'destructive' }),
  });

  return { designar, remover, setAcessoRestrito };
}

// ── Utilizadores do cliente (consola, nível 4) ───────────────

export interface HubOrgMember {
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  acesso_restrito: boolean;
  profiles: { nome_completo: string | null; email: string | null } | null;
}

export function useHubOrgMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ['organization-members', organizationId, 'hub'],
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<HubOrgMember[]> => {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('user_id, role, acesso_restrito')
        .eq('organization_id', organizationId!);
      if (error) throw error;
      if (!members?.length) return [];
      // Sem FK members→profiles: juntar em duas queries (padrão do repo).
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .in(
          'id',
          members.map((m) => m.user_id),
        );
      if (profilesError) throw profilesError;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return members.map((m) => ({
        ...m,
        profiles: byId.get(m.user_id)
          ? {
              nome_completo: byId.get(m.user_id)!.nome_completo,
              email: byId.get(m.user_id)!.email,
            }
          : null,
      }));
    },
  });
}

export function useUpdateMemberRole(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: HubOrgMember['role'] }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('user_id', userId)
        .eq('organization_id', organizationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      toast({ title: 'Papel atualizado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao atualizar papel', description: e.message, variant: 'destructive' }),
  });
}

/** Info da org selecionada relevante para a consola (grupo, portal). */
export function useHubOrgInfo(organizationId: string | null) {
  return useQuery({
    queryKey: ['hub-org-info', organizationId],
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, client_code, hub_grupo_id, portal_ativa')
        .eq('id', organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ── Auditoria ────────────────────────────────────────────────

export interface HubAuditoriaEntry {
  id: string;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export function useHubAuditoria(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.hub.auditoria(organizationId ?? 'none'),
    enabled: !!organizationId,
    staleTime: 15 * 1000,
    queryFn: async (): Promise<HubAuditoriaEntry[]> => {
      const { data, error } = await supabase.rpc('hub_auditoria_list', {
        p_org: organizationId!,
        p_limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as HubAuditoriaEntry[];
    },
  });
}
