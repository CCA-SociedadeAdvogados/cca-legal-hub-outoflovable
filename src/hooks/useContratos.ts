import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Contrato = Tables<'contratos'>;
export type ContratoInsert = TablesInsert<'contratos'>;
export type ContratoUpdate = TablesUpdate<'contratos'>;

export const useContratos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { viewingOrganizationId } = useCliente();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar contrato', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar contrato', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato arquivado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao arquivar contrato', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato restaurado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao restaurar contrato', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato eliminado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao eliminar contrato', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: `${data?.length || 0} contrato(s) criado(s) com sucesso` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar contratos', description: error.message, variant: 'destructive' });
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
        .single();
      
      if (error) throw error;
      return data as Contrato;
    },
    enabled: !!id && !!user,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: true, // Revalidate when window gains focus
  });
};
