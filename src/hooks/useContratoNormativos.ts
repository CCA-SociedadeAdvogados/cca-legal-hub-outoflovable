import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContratoNormativo {
  id: string;
  contrato_id: string;
  documento_id: string;
  relevancia_score: number;
  motivo_associacao: string | null;
  tipo_associacao: string;
  created_at: string;
}

interface LegalDocument {
  id: string;
  title: string | null;
  source_key: string;
  canonical_url: string;
  doc_type: string;
  storage_path: string | null;
}

interface ContratoNormativoWithDoc extends ContratoNormativo {
  documento?: LegalDocument;
}

export function useContratoNormativos(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['contrato-normativos', contratoId],
    queryFn: async (): Promise<ContratoNormativoWithDoc[]> => {
      if (!contratoId) return [];

      // Fetch associations
      const { data: associations, error } = await supabase
        .from('contrato_normativos')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('relevancia_score', { ascending: false });

      if (error) throw error;
      if (!associations || associations.length === 0) return [];

      // Fetch document details for each association
      const result: ContratoNormativoWithDoc[] = [];
      for (const assoc of associations) {
        const { data: docData } = await supabase.rpc('get_legal_document', {
          p_id: assoc.documento_id
        });

        result.push({
          ...assoc,
          documento: docData?.[0] ? {
            id: docData[0].id,
            title: docData[0].title,
            source_key: docData[0].source_key,
            canonical_url: docData[0].canonical_url,
            doc_type: docData[0].doc_type,
            storage_path: docData[0].storage_path
          } : undefined
        });
      }

      return result;
    },
    enabled: !!contratoId
  });
}

export function useMatchLegislation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contratoId: string) => {
      const { data, error } = await supabase.functions.invoke('match-legislation', {
        body: { contrato_id: contratoId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, contratoId) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-normativos', contratoId] });
      
      if (data.matches?.length > 0) {
        toast.success(`Encontrados ${data.matches.length} documentos legais relevantes`);
      } else {
        toast.info('Nenhum documento legal relevante encontrado');
      }
    },
    onError: (error: Error) => {
      console.error('Match legislation error:', error);
      if (error.message.includes('Rate limit')) {
        toast.error('Limite de pedidos excedido. Tente novamente mais tarde.');
      } else if (error.message.includes('credits')) {
        toast.error('Créditos AI esgotados. Adicione créditos ao workspace.');
      } else {
        toast.error('Erro ao procurar legislação relevante');
      }
    }
  });
}

export function useRemoveContratoNormativo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contratoId }: { id: string; contratoId: string }) => {
      const { error } = await supabase
        .from('contrato_normativos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return contratoId;
    },
    onSuccess: (contratoId) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-normativos', contratoId] });
      toast.success('Associação removida');
    },
    onError: () => {
      toast.error('Erro ao remover associação');
    }
  });
}

export function getStorageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('legal-mirror').getPublicUrl(storagePath);
  return data?.publicUrl || null;
}
