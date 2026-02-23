import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ContentBlock {
  id: string;
  organization_id: string;
  content_key: string;
  title: string | null;
  content: string | null;
  content_type: 'text' | 'markdown' | 'json' | 'html';
  media_refs: unknown[];
  updated_by_id: string | null;
  updated_at: string;
  created_at: string;
}

export function useContentBlocks(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevOrgIdRef = useRef<string | null>(null);

  const { data: blocks, isLoading, error, refetch } = useQuery({
    queryKey: ['contentBlocks', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('client_content_blocks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('content_key');

      if (error) throw error;
      return data as ContentBlock[];
    },
    enabled: !!organizationId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Force refetch when organizationId changes
  useEffect(() => {
    if (organizationId && prevOrgIdRef.current !== organizationId) {
      const oldOrgId = prevOrgIdRef.current;
      prevOrgIdRef.current = organizationId;
      // Clear cached data for the OLD org (not the new one)
      if (oldOrgId) {
        queryClient.removeQueries({ queryKey: ['contentBlocks', oldOrgId] });
      }
      refetch();
    }
  }, [organizationId, queryClient, refetch]);

  const upsertBlockMutation = useMutation({
    mutationFn: async (block: {
      content_key: string;
      title?: string;
      content?: string;
      content_type?: 'text' | 'markdown' | 'json' | 'html';
    }) => {
      if (!organizationId || !user) throw new Error('Missing organization or user');

      const { data: existing } = await supabase
        .from('client_content_blocks')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('content_key', block.content_key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('client_content_blocks')
          .update({
            title: block.title,
            content: block.content,
            content_type: block.content_type || 'text',
            updated_by_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_content_blocks')
          .insert({
            organization_id: organizationId,
            content_key: block.content_key,
            title: block.title,
            content: block.content,
            content_type: block.content_type || 'text',
            updated_by_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentBlocks', organizationId] });
      toast.success('Conteúdo guardado');
    },
    onError: (error) => {
      console.error('Error saving content block:', error);
      toast.error('Erro ao guardar conteúdo');
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (contentKey: string) => {
      if (!organizationId) throw new Error('Missing organization');

      const { error } = await supabase
        .from('client_content_blocks')
        .delete()
        .eq('organization_id', organizationId)
        .eq('content_key', contentKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentBlocks', organizationId] });
      toast.success('Conteúdo eliminado');
    },
    onError: (error) => {
      console.error('Error deleting content block:', error);
      toast.error('Erro ao eliminar conteúdo');
    },
  });

  const getBlock = (contentKey: string): ContentBlock | undefined => {
    return blocks?.find((b) => b.content_key === contentKey);
  };

  return {
    blocks,
    isLoading,
    error,
    getBlock,
    upsertBlock: upsertBlockMutation.mutate,
    isUpserting: upsertBlockMutation.isPending,
    deleteBlock: deleteBlockMutation.mutate,
    isDeleting: deleteBlockMutation.isPending,
  };
}

export function useContentBlock(organizationId: string | null, contentKey: string) {
  const { blocks, isLoading, upsertBlock, isUpserting } = useContentBlocks(organizationId);

  const block = blocks?.find((b) => b.content_key === contentKey);

  const updateBlock = (updates: { title?: string; content?: string }) => {
    upsertBlock({
      content_key: contentKey,
      ...updates,
    });
  };

  return {
    block,
    isLoading,
    updateBlock,
    isUpdating: isUpserting,
  };
}
