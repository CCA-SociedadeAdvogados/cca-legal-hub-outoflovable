import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Contrato = Tables<'contratos'>;
export type ContratoInsert = TablesInsert<'contratos'>;
export type ContratoUpdate = TablesUpdate<'contratos'>;

// Fire-and-forget SharePoint folder creation (non-blocking)
function createContractSharePointFolders(
  organizationId: string,
  contratoId: string,
  clientCode?: string,
  tipoContrato?: string
) {
  supabase.functions
    .invoke("sync-sharepoint", {
      body: {
        action: "create_contract_folders",
        organization_id: organizationId,
        contrato_id: contratoId,
        client_code: clientCode,
        tipo_contrato: tipoContrato,
      },
    })
    .catch(() => {
      // Non-blocking — SharePoint folder creation is best-effort
    });
}

export const useContratos = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { viewingOrganizationId, cliente } = useCliente();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  // For CCA internal users, require explicit client selection — don't fall back to CCA org
  const organizationId = viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  const { data: contratos, isLoading, error, refetch } = useQuery({
    queryKey: ['contratos', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('contratos')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('arquivado', false)
        .order('created_at', { ascending: false })
        .range(0, 199);

      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const createContrato = useMutation({
    mutationFn: async (contrato: ContratoInsert) => {
      if (!user) throw new Error('Utilizador não autenticado');
      if (!organizationId) throw new Error('Nenhuma organização selecionada');

      const { data, error } = await supabase
        .from('contratos')
        .insert([{ 
          ...contrato, 
          created_by_id: user.id, 
          updated_by_id: user.id,
          organization_id: organizationId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractCreated') });

      // Fire-and-forget: create SharePoint folder structure
      if (data && organizationId) {
        createContractSharePointFolders(
          organizationId,
          data.id,
          cliente?.clientCode,
          data.tipo_contrato ?? undefined
        );
      }
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractCreateError'), description: error.message, variant: 'destructive' });
    },
  });

  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contratos')
        .update({ ...updates, updated_by_id: user?.id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractUpdateError'), description: error.message, variant: 'destructive' });
    },
  });

  const archiveContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ arquivado: true, updated_by_id: user?.id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractArchived') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractArchiveError'), description: error.message, variant: 'destructive' });
    },
  });

  const restoreContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ arquivado: false, updated_by_id: user?.id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractRestored') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractRestoreError'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractDeleteError'), description: error.message, variant: 'destructive' });
    },
  });

  const createContratosBulk = useMutation({
    mutationFn: async (contratos: ContratoInsert[]) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert(contratos)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos', organizationId] });
      toast({ title: t('toasts.contractCreatedBulk', { count: data?.length || 0 }) });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.contractCreateBulkError'), description: error.message, variant: 'destructive' });
    },
  });

  return {
    contratos,
    isLoading,
    error,
    refetch,
    createContrato,
    createContratosBulk,
    updateContrato,
    archiveContrato,
    restoreContrato,
    deleteContrato,
  };
};

// Hook for fetching a single contract with fresh data
export const useContrato = (id?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contrato', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as Contrato;
    },
    enabled: !!id && !!user,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
};
