import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type EventoLegislativo = Tables<'eventos_legislativos'>;
export type EventoLegislativoInsert = TablesInsert<'eventos_legislativos'>;
export type EventoLegislativoUpdate = TablesUpdate<'eventos_legislativos'>;

export const useEventosLegislativos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { viewingOrganizationId } = useCliente();
  const { currentOrganization } = useOrganizations();
  const organizationId = viewingOrganizationId || currentOrganization?.id || null;

  const { data: eventos, isLoading, error } = useQuery({
    queryKey: ['eventos_legislativos', organizationId],
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('eventos_legislativos')
        .select('*')
        .eq('organization_id', organizationId)
        .order('data_publicacao', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!organizationId,
  });

  const createEvento = useMutation({
    mutationFn: async (evento: EventoLegislativoInsert) => {
      if (!user) throw new Error('Utilizador não autenticado');
      if (!organizationId) throw new Error('Nenhuma organização selecionada');

      const { data, error } = await supabase
        .from('eventos_legislativos')
        .insert([{ 
          ...evento, 
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
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos'] });
      toast({ title: 'Evento criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar evento', description: error.message, variant: 'destructive' });
    },
  });

  const updateEvento = useMutation({
    mutationFn: async ({ id, ...updates }: EventoLegislativoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('eventos_legislativos')
        .update({ ...updates, updated_by_id: user?.id })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos'] });
      toast({ title: 'Evento atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar evento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eventos_legislativos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos'] });
      toast({ title: 'Evento eliminado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao eliminar evento', description: error.message, variant: 'destructive' });
    },
  });

  return {
    eventos,
    isLoading,
    error,
    createEvento,
    updateEvento,
    deleteEvento,
  };
};
