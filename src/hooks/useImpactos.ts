import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Impacto = Tables<'impactos'>;
export type ImpactoInsert = TablesInsert<'impactos'>;
export type ImpactoUpdate = TablesUpdate<'impactos'>;

export type ImpactoWithRelations = Impacto & {
  eventos_legislativos: Tables<'eventos_legislativos'> | null;
  contratos: Tables<'contratos'> | null;
};

const getCurrentOrganizationId = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.current_organization_id || null;
};

export const useImpactos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: impactos, isLoading, error } = useQuery({
    queryKey: ['impactos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impactos')
        .select(`
          *,
          eventos_legislativos(*),
          contratos(id, titulo_contrato, id_interno)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ImpactoWithRelations[];
    },
    enabled: !!user,
  });

  const createImpacto = useMutation({
    mutationFn: async (impacto: ImpactoInsert) => {
      if (!user) throw new Error('Utilizador não autenticado');
      
      const organizationId = await getCurrentOrganizationId(user.id);
      if (!organizationId) throw new Error('Nenhuma organização selecionada');

      const { data, error } = await supabase
        .from('impactos')
        .insert([{ 
          ...impacto, 
          created_by_id: user.id,
          organization_id: organizationId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impactos'] });
      toast({ title: 'Impacto registado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registar impacto', description: error.message, variant: 'destructive' });
    },
  });

  const updateImpacto = useMutation({
    mutationFn: async ({ id, ...updates }: ImpactoUpdate & { id: string }) => {
      const updateData: ImpactoUpdate = { ...updates };
      
      // If resolving, set resolution data
      if (updates.estado === 'resolvido') {
        updateData.data_resolucao = new Date().toISOString().split('T')[0];
        updateData.resolvido_por_id = user?.id;
      }
      
      const { data, error } = await supabase
        .from('impactos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impactos'] });
      toast({ title: 'Impacto atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar impacto', description: error.message, variant: 'destructive' });
    },
  });

  const stats = {
    total: impactos?.length ?? 0,
    alto: impactos?.filter(i => i.nivel_risco === 'alto').length ?? 0,
    medio: impactos?.filter(i => i.nivel_risco === 'medio').length ?? 0,
    baixo: impactos?.filter(i => i.nivel_risco === 'baixo').length ?? 0,
    pendentes: impactos?.filter(i => i.estado === 'pendente_analise').length ?? 0,
    emTratamento: impactos?.filter(i => i.estado === 'em_tratamento').length ?? 0,
  };

  return {
    impactos,
    isLoading,
    error,
    stats,
    createImpacto,
    updateImpacto,
  };
};
