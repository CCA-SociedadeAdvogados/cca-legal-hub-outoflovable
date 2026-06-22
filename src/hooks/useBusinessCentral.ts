import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BCConfig {
  id: string;
  organization_id: string;
  bc_url: string;
  company_guid: string;
  company_name: string | null;
  is_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'error' | 'running' | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BCCustomer {
  id: string;
  organization_id: string;
  config_id: string;
  bc_id: string;
  bc_number: string | null;
  display_name: string;
  nif: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  post_code: string | null;
  phone: string | null;
  email: string | null;
  balance: number | null;
  credit_limit: number | null;
  payment_terms_code: string | null;
  currency_code: string | null;
  customer_posting_group: string | null;
  bc_last_modified: string | null;
  is_deleted: boolean;
  synced_at: string;
}

export interface BCAccount {
  id: string;
  organization_id: string;
  config_id: string;
  bc_id: string;
  account_number: string | null;
  display_name: string;
  account_category: string | null;
  account_sub_category: string | null;
  balance: number | null;
  account_type: string | null;
  blocked: boolean;
  synced_at: string;
}

export interface BCLedgerEntry {
  id: string;
  organization_id: string;
  config_id: string;
  bc_entry_number: number | null;
  customer_bc_id: string | null;
  customer_number: string | null;
  posting_date: string | null;
  document_type: string | null;
  document_number: string | null;
  description: string | null;
  amount: number | null;
  remaining_amount: number | null;
  due_date: string | null;
  currency_code: string | null;
  is_open: boolean;
  posting_group: string | null;
  synced_at: string;
  bc_customers?: {
    display_name: string;
    bc_number: string | null;
    nif: string | null;
  } | null;
}

export interface BCSyncLog {
  id: string;
  config_id: string;
  organization_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'error';
  customers_synced: number;
  accounts_synced: number;
  ledger_entries_synced: number;
  error_message: string | null;
}

export interface BCSyncStatus {
  config: BCConfig | null;
  logs: BCSyncLog[];
  counts: {
    customers: number;
    accounts: number;
    ledger_entries: number;
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

// Configuração BC para a org do utilizador atual
export function useBusinessCentralConfig() {
  const { profile } = useProfile();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: queryKeys.businessCentral.config(orgId),
    queryFn: async (): Promise<BCConfig | null> => {
      if (!orgId) return null;

      const { data, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (
                c: string,
                v: string,
              ) => { maybeSingle: () => Promise<{ data: BCConfig | null; error: unknown }> };
            };
          };
        }
      )
        .from('bc_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BC config:', error);
        return null;
      }

      return data as BCConfig | null;
    },
    enabled: !!orgId,
  });
}

// Estado de sincronização (config + logs + contadores)
export function useBusinessCentralSyncStatus() {
  const { profile } = useProfile();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: queryKeys.businessCentral.syncStatus(orgId),
    queryFn: async (): Promise<BCSyncStatus | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'get_sync_status',
          organization_id: orgId,
        },
      });

      if (error) {
        console.error('Error fetching BC sync status:', error);
        return null;
      }

      return (data?.data as BCSyncStatus | null) ?? null;
    },
    enabled: !!orgId,
  });
}

// Clientes BC com pesquisa opcional
export function useBusinessCentralCustomers(search?: string) {
  const { profile } = useProfile();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: queryKeys.businessCentral.customers(orgId, search),
    queryFn: async (): Promise<BCCustomer[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'fetch_customers',
          organization_id: orgId,
          search: search || undefined,
          limit: 200,
        },
      });

      if (error) {
        console.error('Error fetching BC customers:', error);
        return [];
      }

      return (data?.data || []) as BCCustomer[];
    },
    enabled: !!orgId,
  });
}

// Contas BC
export function useBusinessCentralAccounts() {
  const { profile } = useProfile();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: queryKeys.businessCentral.accounts(orgId),
    queryFn: async (): Promise<BCAccount[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'fetch_accounts',
          organization_id: orgId,
        },
      });

      if (error) {
        console.error('Error fetching BC accounts:', error);
        return [];
      }

      return (data?.data || []) as BCAccount[];
    },
    enabled: !!orgId,
  });
}

// Lançamentos da conta corrente
export function useBusinessCentralLedger(params: {
  customerBcId?: string;
  customerNumber?: string;
  isOpen?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { profile } = useProfile();
  const orgId = profile?.current_organization_id;
  const enabled = !!orgId && (!!params.customerBcId || !!params.customerNumber);

  return useQuery({
    queryKey: queryKeys.businessCentral.ledger(orgId, params),
    queryFn: async (): Promise<BCLedgerEntry[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'fetch_ledger',
          organization_id: orgId,
          customer_bc_id: params.customerBcId || undefined,
          customer_number: params.customerNumber || undefined,
          is_open: params.isOpen,
          date_from: params.dateFrom || undefined,
          date_to: params.dateTo || undefined,
          limit: 500,
        },
      });

      if (error) {
        console.error('Error fetching BC ledger:', error);
        return [];
      }

      return (data?.data || []) as BCLedgerEntry[];
    },
    enabled,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Guardar/atualizar configuração BC
export function useSaveBusinessCentralConfig() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: {
      bc_url: string;
      company_guid: string;
      company_name?: string;
      is_enabled?: boolean;
      sync_interval_minutes?: number;
    }) => {
      if (!profile?.current_organization_id) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'save_config',
          organization_id: profile.current_organization_id,
          ...config,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to save config');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bc-config'] });
      queryClient.invalidateQueries({ queryKey: ['bc-sync-status'] });
      toast({ title: t('businessCentral.configSaved', 'Configuração Business Central guardada') });
    },
    onError: (error: unknown) => {
      console.error('Error saving BC config:', error);
      toast({
        title: t('businessCentral.configError', 'Erro ao guardar configuração'),
        variant: 'destructive',
      });
    },
  });
}

// Eliminar configuração e dados BC
export function useDeleteBusinessCentralConfig() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.current_organization_id) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'delete_config',
          organization_id: profile.current_organization_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete config');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bc-config'] });
      queryClient.invalidateQueries({ queryKey: ['bc-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['bc-customers'] });
      queryClient.invalidateQueries({ queryKey: ['bc-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bc-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['bc-sync-logs'] });
      toast({ title: t('businessCentral.configDeleted', 'Integração Business Central removida') });
    },
    onError: (error: unknown) => {
      console.error('Error deleting BC config:', error);
      toast({
        title: t('businessCentral.deleteError', 'Erro ao remover integração'),
        variant: 'destructive',
      });
    },
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

// Config BC para uma org específica (admin)
export function useBusinessCentralConfigByOrgId(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.businessCentral.config(orgId),
    queryFn: async (): Promise<BCConfig | null> => {
      if (!orgId) return null;

      const { data, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (
                c: string,
                v: string,
              ) => { maybeSingle: () => Promise<{ data: BCConfig | null; error: unknown }> };
            };
          };
        }
      )
        .from('bc_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BC config by orgId:', error);
        return null;
      }

      return data as BCConfig | null;
    },
    enabled: !!orgId,
  });
}

// Guardar config BC para uma org específica (admin)
export function useSaveBusinessCentralConfigForOrg() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      bc_url: string;
      company_guid: string;
      company_name?: string;
      is_enabled?: boolean;
      sync_interval_minutes?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('fetch-business-central', {
        body: {
          action: 'save_config',
          organization_id: params.organization_id,
          bc_url: params.bc_url,
          company_guid: params.company_guid,
          company_name: params.company_name,
          is_enabled: params.is_enabled ?? true,
          sync_interval_minutes: params.sync_interval_minutes ?? 60,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to save config');
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessCentral.config(variables.organization_id),
      });
      toast({ title: t('businessCentral.configSaved', 'Configuração Business Central guardada') });
    },
    onError: (error: unknown) => {
      console.error('Error saving BC config for org:', error);
      toast({
        title: t('businessCentral.configError', 'Erro ao guardar configuração'),
        variant: 'destructive',
      });
    },
  });
}
