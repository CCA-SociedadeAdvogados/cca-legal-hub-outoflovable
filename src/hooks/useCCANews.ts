import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface CCANews {
  id: string;
  organization_id: string | null;
  titulo: string;
  resumo: string | null;
  conteudo: string;
  estado: "rascunho" | "publicado" | "arquivado";
  data_publicacao: string | null;
  anexos: Json;
  links: Json;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCCANews() {
  const { user } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const queryClient = useQueryClient();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["cca-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cca_news")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CCANews[];
    },
    enabled: !!user,
  });

  const createNews = useMutation({
    mutationFn: async (data: {
      titulo: string;
      resumo?: string;
      conteudo: string;
      estado?: "rascunho" | "publicado" | "arquivado";
      data_publicacao?: string;
    }) => {
      const insertData = {
        titulo: data.titulo,
        resumo: data.resumo,
        conteudo: data.conteudo,
        estado: data.estado || "rascunho",
        data_publicacao: data.estado === "publicado" ? new Date().toISOString() : data.data_publicacao,
        created_by_id: user?.id,
      };

      const { data: result, error } = await supabase
        .from("cca_news")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cca-news"] });
      toast.success("Novidade criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar novidade");
    },
  });

  const updateNews = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      titulo?: string;
      resumo?: string;
      conteudo?: string;
      estado?: "rascunho" | "publicado" | "arquivado";
      data_publicacao?: string;
    }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // Se está a publicar, definir data de publicação
      if (data.estado === "publicado" && !data.data_publicacao) {
        updateData.data_publicacao = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from("cca_news")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cca-news"] });
      toast.success("Novidade atualizada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar novidade");
    },
  });

  const deleteNews = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cca_news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cca-news"] });
      toast.success("Novidade eliminada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao eliminar novidade");
    },
  });

  const publishNews = useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("cca_news")
        .update({ 
          estado: "publicado", 
          data_publicacao: new Date().toISOString() 
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cca-news"] });
      toast.success("Novidade publicada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao publicar novidade");
    },
  });

  const archiveNews = useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("cca_news")
        .update({ estado: "arquivado" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cca-news"] });
      toast.success("Novidade arquivada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao arquivar novidade");
    },
  });

  // Filtra novidades baseado no papel do utilizador
  const visibleNews = isPlatformAdmin 
    ? news 
    : news.filter(n => n.estado === "publicado");

  return {
    news: visibleNews,
    allNews: news,
    isLoading,
    isPlatformAdmin,
    createNews,
    updateNews,
    deleteNews,
    publishNews,
    archiveNews,
  };
}
