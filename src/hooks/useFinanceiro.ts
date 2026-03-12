import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { toast } from 'sonner';

export interface FinancialHomeData {
  organization_id: string;
  client_code: string;
  organization_name: string;
  legacy_client_name: string;
  group_code: string | null;
  cost_center: string | null;
  responsible: string | null;
  responsible_email: string | null;
  total_documentos: number;
  total_pendente: number;
  total_vencido: number;
  total_a_vencer: number;
  ultima_sincronizacao: string | null;
}

export interface FinancialSummaryData {
  organization_id: string;
  client_code: string;
  organization_name: string;
  legacy_client_name: string;
  group_code: string | null;
  total_documentos: number;
  total_pendente: number;
  total_vencido: number;
  total_a_vencer: number;
  ultima_sincronizacao: string | null;
}

export interface FinancialItem {
  organization_id: string;
  client_code: string;
  organization_name: string;
  legacy_client_name: string;
  group_code: string | null;
  numero_documento: string | null;
  descricao: string | null;
  valor: number;
  data_vencimento: string | null;
  estado: 'vencido' | 'a_vencer';
  synced_at: string | null;
}

export interface FinancialEntitySummary {
  entity_organization_id: string;
  entity_client_code: string;
  entity_name: string;
  group_code: string | null;
  total_documentos: number;
  total_pendente: number;
  total_vencido: number;
  total_a_vencer: number;
  ultima_sincronizacao: string | null;
}

export type AccountStatus = 'em_dia' | 'em_aberto' | 'em_incumprimento';

export interface AccountSummary {
  status: AccountStatus;
  tipoCliente: 'pessoa_individual' | 'pessoa_coletiva';
  prazoPagamentoDias: number;
  totalEmAberto: number;
  totalFaturasEmIncumprimento: number;
  faturasEmAberto: number;
  faturasVencidas: number;
  proximoVencimento: Date | null;
  emIncumprimentoDesde: Date | null;
}

function calculateStatus(summary: FinancialSummaryData | null): AccountStatus {
  if (!summary || Number(summary.total_pendente ?? 0) <= 0) {
    return 'em_dia';
  }

  const vencido = Number(summary.total_vencido ?? 0);
  if (vencido <= 0) return 'em_aberto';

  return 'em_incumprimento';
}

/**
 * @param overrideOrgId organização efectiva a usar
 * @param _overrideJvrisId mantido apenas por compatibilidade, sem uso no novo modelo
 */
export function useFinanceiro(overrideOrgId?: string, _overrideJvrisId?: string | null) {
  const { profile } = useProfile();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { currentOrganization } = useOrganizations();
  const { viewingOrganizationId } = useCliente();
  const queryClient = useQueryClient();

  const userId = profile?.id ?? null;
  const organizationId = overrideOrgId || viewingOrganizationId || currentOrganization?.id || null;

  const { data: organizationInfo, isLoading: isLoadingOrgInfo } = useQuery({
    queryKey: ['organization-financial-info', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const { data, error } = await supabase.rpc('fn_get_client_home_for_actor', {
        p_user_id: userId,
        p_viewing_organization_id: organizationId,
      });

      if (error) throw error;
      return (data?.[0] ?? null) as FinancialHomeData | null;
    },
    enabled: !!userId && !!organizationId,
  });

  const { data: financialSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['financial-summary', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const { data, error } = await supabase.rpc('fn_get_financial_summary_for_actor', {
        p_user_id: userId,
        p_viewing_organization_id: organizationId,
      });

      if (error) throw error;
      return (data?.[0] ?? null) as FinancialSummaryData | null;
    },
    enabled: !!userId && !!organizationId,
  });

  const { data: financialItems = [], isLoading: isLoadingItems, error: financialItemsError } = useQuery({
    queryKey: ['financial-items', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return [];

      const { data, error } = await supabase.rpc('fn_get_financial_items_for_actor', {
        p_user_id: userId,
        p_viewing_organization_id: organizationId,
      });

      if (error) throw error;
      return (data ?? []) as FinancialItem[];
    },
    enabled: !!userId && !!organizationId,
  });

  const { data: financialByEntity = [], isLoading: isLoadingByEntity } = useQuery({
    queryKey: ['financial-by-entity', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return [];

      const { data, error } = await supabase.rpc('fn_get_financial_summary_by_entity_for_actor', {
        p_user_id: userId,
        p_viewing_organization_id: organizationId,
      });

      if (error) throw error;
      return (data ?? []) as FinancialEntitySummary[];
    },
    enabled: !!userId && !!organizationId,
  });

  const accountSummary: AccountSummary = {
    status: calculateStatus(financialSummary),
    tipoCliente: 'pessoa_coletiva',
    prazoPagamentoDias: 30,
    totalEmAberto: Number(financialSummary?.total_pendente ?? 0),
    totalFaturasEmIncumprimento: Number(financialSummary?.total_documentos ?? 0),
    faturasEmAberto: financialItems.filter((item) => item.estado === 'a_vencer').length,
    faturasVencidas: financialItems.filter((item) => item.estado === 'vencido').length,
    proximoVencimento:
      financialItems.find((item) => item.estado === 'a_vencer' && item.data_vencimento)?.data_vencimento
        ? new Date(
            financialItems.find((item) => item.estado === 'a_vencer' && item.data_vencimento)!.data_vencimento!,
          )
        : null,
    emIncumprimentoDesde:
      financialItems
        .filter((item) => item.estado === 'vencido' && item.data_vencimento)
        .sort((a, b) => new Date(a.data_vencimento!).getTime() - new Date(b.data_vencimento!).getTime())[0]
        ?.data_vencimento
        ? new Date(
            financialItems
              .filter((item) => item.estado === 'vencido' && item.data_vencimento)
              .sort((a, b) => new Date(a.data_vencimento!).getTime() - new Date(b.data_vencimento!).getTime())[0]
              .data_vencimento!,
          )
        : null,
  };

  const updateOrganizationFinancial = useMutation({
    mutationFn: async (data: {
      tipo_cliente: 'pessoa_individual' | 'pessoa_coletiva';
      prazo_pagamento_dias: number;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida.');
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          tipo_cliente: data.tipo_cliente,
        })
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-financial-info', userId, organizationId],
      });
      toast.success('Configurações actualizadas');
    },
    onError: (error) => {
      toast.error('Erro ao actualizar configurações: ' + error.message);
    },
  });

  return {
    organizationId,
    accountSummary,
    organizationInfo,
    financialSummary,
    financialItems,
    financialByEntity,
    navCache: null,
    navItems: financialItems.map((item, index) => ({
      id: `${item.numero_documento ?? 'doc'}-${index}`,
      jvris_id: item.client_code,
      numero_documento: item.numero_documento,
      valor: item.valor,
      data_vencimento: item.data_vencimento,
      synced_at: item.synced_at,
      descricao: item.descricao,
      estado: item.estado,
    })),
    navError: financialItemsError ?? null,
    jvrisId: organizationInfo?.client_code ?? null,
    baseOrganizationJvrisId: organizationInfo?.client_code ?? null,
    availableJvrisIds: [],
    lastSyncResult: null,
    isLoading: isLoadingOrgInfo || isLoadingSummary,
    isLoadingNav: isLoadingItems || isLoadingByEntity,
    isPlatformAdmin,
    updateOrganizationFinancial,
    syncNavFromSharePoint: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
    setJvrisId: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
    createInvoice: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
    updateInvoiceStatus: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
    deleteInvoice: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
    createFolder: {
      mutate: () => {},
      mutateAsync: async () => null,
      isPending: false,
    },
  };
}
