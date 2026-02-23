import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalDocument {
  id: string;
  source_key: string;
  canonical_url: string;
  doc_type: string;
  title: string | null;
  published_at: string | null;
  fetched_at: string;
  storage_path: string | null;
  mime_type: string | null;
}

interface LegalDocumentDetail extends LegalDocument {
  content_text: string | null;
  meta: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
}

interface Source {
  source_key: string;
  name: string;
  enabled: boolean;
  document_count: number;
}

export function useLegalSources() {
  return useQuery({
    queryKey: ['legal-sources'],
    queryFn: async (): Promise<Source[]> => {
      // Use edge function to get sources since we can't directly query legal schema
      const { data, error } = await supabase.functions.invoke('legal-api', {
        body: { action: 'get_sources' }
      });
      if (error) throw error;
      return (data?.sources as Source[]) || [];
    }
  });
}

export function useLegalSearch(query: string, sourceKey: string | null, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['legal-documents', query, sourceKey, limit, offset],
    queryFn: async (): Promise<LegalDocument[]> => {
      const { data, error } = await supabase.functions.invoke('legal-api', {
        body: { 
          action: 'search',
          q: query || null,
          source: sourceKey,
          limit,
          offset
        }
      });
      
      if (error) throw error;
      return (data?.documents as LegalDocument[]) || [];
    }
  });
}

export function useLegalDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['legal-document', id],
    enabled: !!id,
    queryFn: async (): Promise<LegalDocumentDetail | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase.functions.invoke('legal-api', {
        body: { 
          action: 'get_document',
          id
        }
      });
      
      if (error) throw error;
      return (data?.document as LegalDocumentDetail) || null;
    }
  });
}

export function useTriggerMirror() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('mirror-run', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Atualização iniciada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-sources'] });
    },
    onError: (error) => {
      toast.error('Erro ao iniciar atualização: ' + String(error));
    }
  });
}

export function getStorageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  
  const { data } = supabase.storage
    .from('legal-mirror')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}
