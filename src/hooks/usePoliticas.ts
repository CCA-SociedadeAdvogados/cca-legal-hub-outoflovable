import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export interface Politica {
  id: string;
  organization_id: string | null;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  estado: string;
  versao: number;
  departamento: string | null;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_mime_type: string | null;
}

export function usePoliticas() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: politicas = [], isLoading } = useQuery({
    queryKey: ["politicas", profile?.current_organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("politicas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Politica[];
    },
    enabled: !!profile?.current_organization_id,
  });

  const uploadFile = async (file: File): Promise<{ url: string; path: string } | null> => {
    if (!profile?.current_organization_id) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.current_organization_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('politicas')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    return { url: fileName, path: fileName };
  };

  const createPolitica = useMutation({
    mutationFn: async (data: {
      titulo: string;
      descricao?: string;
      conteudo?: string;
      estado?: string;
      departamento?: string;
      arquivo_url?: string;
      arquivo_nome?: string;
      arquivo_mime_type?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("politicas")
        .insert({
          ...data,
          organization_id: profile?.current_organization_id,
          created_by_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["politicas"] });
      toast.success("Política criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar política");
    },
  });

  const updatePolitica = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      titulo?: string;
      descricao?: string;
      conteudo?: string;
      estado?: string;
      departamento?: string;
      arquivo_url?: string;
      arquivo_nome?: string;
      arquivo_mime_type?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("politicas")
        .update({ ...data, updated_by_id: user?.id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["politicas"] });
      toast.success("Política atualizada!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar política");
    },
  });

  const deletePolitica = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("politicas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["politicas"] });
      toast.success("Política eliminada!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao eliminar política");
    },
  });

  const downloadFile = async (politica: Politica): Promise<void> => {
    if (!politica.arquivo_url) {
      // Fallback to text download
      const content = `${politica.titulo}\n\n${politica.descricao || ''}\n\n${politica.conteudo || ''}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${politica.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const { data, error } = await supabase.storage
      .from('politicas')
      .download(politica.arquivo_url);

    if (error) {
      console.error('Download error:', error);
      toast.error('Erro ao descarregar ficheiro');
      return;
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = politica.arquivo_nome || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    politicas,
    isLoading,
    createPolitica,
    updatePolitica,
    deletePolitica,
    uploadFile,
    downloadFile,
  };
}
