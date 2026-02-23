import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HomeLayout, DEFAULT_HOME_LAYOUT } from '@/lib/defaultHomeLayout';
import { getLayoutForSector } from '@/lib/sectorLayoutTemplates';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface ClientHomeConfig {
  id: string;
  organization_id: string;
  layout_draft: HomeLayout;
  layout_published: HomeLayout | null;
  schema_version: number;
  updated_by_id: string | null;
  updated_at: string;
  published_at: string | null;
  published_by_id: string | null;
  created_at: string;
}

function parseLayoutFromJson(json: Json | null): HomeLayout | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return null;
  }
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.widgets)) {
    return null;
  }
  return {
    widgets: obj.widgets as HomeLayout['widgets'],
    schemaVersion: (obj.schemaVersion as number) || 1,
  };
}

export function useHomeConfig(organizationId: string | null, primarySector?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: homeConfig, isLoading, error } = useQuery({
    queryKey: ['homeConfig', organizationId],
    queryFn: async (): Promise<ClientHomeConfig | null> => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('client_home_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching home config:', error);
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        organization_id: data.organization_id,
        layout_draft: parseLayoutFromJson(data.layout_draft) || DEFAULT_HOME_LAYOUT,
        layout_published: parseLayoutFromJson(data.layout_published),
        schema_version: data.schema_version || 1,
        updated_by_id: data.updated_by_id,
        updated_at: data.updated_at,
        published_at: data.published_at,
        published_by_id: data.published_by_id,
        created_at: data.created_at,
      };
    },
    enabled: !!organizationId,
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (layout: HomeLayout) => {
      if (!organizationId || !user) throw new Error('Missing organization or user');

      const { data: existing } = await supabase
        .from('client_home_config')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('client_home_config')
          .update({
            layout_draft: layout as unknown as Json,
            updated_by_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_home_config')
          .insert({
            organization_id: organizationId,
            layout_draft: layout as unknown as Json,
            updated_by_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeConfig', organizationId] });
      toast.success('Rascunho guardado');
    },
    onError: (error) => {
      console.error('Error saving draft:', error);
      toast.error('Erro ao guardar rascunho');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error('Missing organization or user');

      const draftLayout = homeConfig?.layout_draft || DEFAULT_HOME_LAYOUT;

      const { error } = await supabase
        .from('client_home_config')
        .update({
          layout_published: draftLayout as unknown as Json,
          published_at: new Date().toISOString(),
          published_by_id: user.id,
        })
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeConfig', organizationId] });
      toast.success('Layout publicado com sucesso');
    },
    onError: (error) => {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar layout');
    },
  });

  const revertDraftMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !homeConfig?.layout_published) {
        throw new Error('No published layout to revert to');
      }

      const { error } = await supabase
        .from('client_home_config')
        .update({
          layout_draft: homeConfig.layout_published as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeConfig', organizationId] });
      toast.success('Rascunho revertido para a versão publicada');
    },
    onError: (error) => {
      console.error('Error reverting:', error);
      toast.error('Erro ao reverter rascunho');
    },
  });

  // Get the layout to display (published for regular users, draft for editing admins)
  // Falls back to sector-specific template if no custom layout exists
  const getDisplayLayout = (isEditing: boolean = false): HomeLayout => {
    const sectorFallback = getLayoutForSector(primarySector ?? null) || DEFAULT_HOME_LAYOUT;
    
    if (!homeConfig) {
      return sectorFallback;
    }
    if (isEditing) {
      return homeConfig.layout_draft;
    }
    return homeConfig.layout_published || sectorFallback;
  };

  const hasDraftChanges = homeConfig?.layout_published
    ? JSON.stringify(homeConfig.layout_draft) !== JSON.stringify(homeConfig.layout_published)
    : homeConfig?.layout_draft !== undefined;

  return {
    homeConfig,
    isLoading,
    error,
    saveDraft: saveDraftMutation.mutate,
    isSavingDraft: saveDraftMutation.isPending,
    publish: publishMutation.mutate,
    isPublishing: publishMutation.isPending,
    revertDraft: revertDraftMutation.mutate,
    isReverting: revertDraftMutation.isPending,
    getDisplayLayout,
    hasDraftChanges,
  };
}
