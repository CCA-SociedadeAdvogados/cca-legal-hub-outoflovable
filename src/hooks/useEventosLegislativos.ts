import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { viewingOrganizationId } = useCliente();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  // For CCA internal users, require explicit client selection
  const organizationId = viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

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
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos', organizationId] });
      toast({ title: t('toasts.eventCreated') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.eventCreateError'), description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos', organizationId] });
      toast({ title: t('toasts.eventUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.eventUpdateError'), description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['eventos_legislativos', organizationId] });
      toast({ title: t('toasts.eventDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: t('toasts.eventDeleteError'), description: error.message, variant: 'destructive' });
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
