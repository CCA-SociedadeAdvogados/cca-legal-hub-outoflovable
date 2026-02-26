import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { safeFileName } from '@/lib/utils';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Anexo = Tables<'anexos_contrato'>;
export type AnexoInsert = TablesInsert<'anexos_contrato'>;

export const useAnexos = (contratoId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: anexos, isLoading, error } = useQuery({
    queryKey: ['anexos', contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anexos_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId && !!user,
  });

  const uploadAnexo = useMutation({
    mutationFn: async ({ 
      file, 
      tipoAnexo, 
      descricao 
    }: { 
      file: File; 
      tipoAnexo: 'pdf_principal' | 'anexo' | 'adenda' | 'outro';
      descricao?: string;
    }) => {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${contratoId}/${Date.now()}_${safeFileName(file.name)}`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contratos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) for signed URL generation later
      const storagePath = fileName;

      // Insert record in anexos_contrato with storage path
      const { data, error } = await supabase
        .from('anexos_contrato')
        .insert([{
          contrato_id: contratoId,
          nome_ficheiro: file.name,
          url_ficheiro: storagePath, // Store path, not public URL
          tipo_anexo: tipoAnexo,
          descricao,
          tamanho_bytes: file.size,
          mime_type: file.type,
          uploaded_by_id: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', contratoId] });
      toast({ title: 'Ficheiro carregado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao carregar ficheiro', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteAnexo = useMutation({
    mutationFn: async (anexo: Anexo) => {
      // url_ficheiro stores the storage path directly (e.g. "contratoId/timestamp_file.pdf")
      // For legacy records that stored the full URL, extract the path after '/contratos/'
      let filePath = anexo.url_ficheiro;
      if (filePath.includes('/contratos/')) {
        filePath = filePath.split('/contratos/')[1];
      }

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('contratos')
          .remove([filePath]);
        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete record
      const { error } = await supabase
        .from('anexos_contrato')
        .delete()
        .eq('id', anexo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', contratoId] });
      toast({ title: 'Ficheiro eliminado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao eliminar ficheiro', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const downloadAnexo = async (anexo: Anexo) => {
    try {
      // Get the file path - handle both old (full URL) and new (path only) formats
      let filePath = anexo.url_ficheiro;
      
      // If it's a full URL (legacy), extract the path
      if (filePath.includes('/contratos/')) {
        const urlParts = filePath.split('/contratos/');
        if (urlParts.length > 1) {
          filePath = urlParts[1];
        }
      }
      
      // Download the file using signed URL
      const { data, error } = await supabase.storage
        .from('contratos')
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.nome_ficheiro;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ 
        title: 'Erro ao descarregar ficheiro', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Helper to get a signed URL for viewing files
  const getSignedUrl = async (anexo: Anexo): Promise<string | null> => {
    try {
      let filePath = anexo.url_ficheiro;
      
      // If it's a full URL (legacy), extract the path
      if (filePath.includes('/contratos/')) {
        const urlParts = filePath.split('/contratos/');
        if (urlParts.length > 1) {
          filePath = urlParts[1];
        }
      }
      
      const { data, error } = await supabase.storage
        .from('contratos')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  return {
    anexos,
    isLoading,
    error,
    uploadAnexo,
    deleteAnexo,
    downloadAnexo,
    getSignedUrl,
  };
};
