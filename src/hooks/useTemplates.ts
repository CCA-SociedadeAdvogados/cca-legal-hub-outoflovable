import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export interface Template {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  placeholders: string[] | null;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

export function useTemplates() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", profile?.current_organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: !!profile?.current_organization_id,
  });

  const createTemplate = useMutation({
    mutationFn: async (data: {
      nome: string;
      descricao?: string;
      tipo?: string;
      conteudo: string;
      placeholders?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from("templates")
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
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      nome?: string;
      descricao?: string;
      tipo?: string;
      conteudo?: string;
      placeholders?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from("templates")
        .update({ ...data, updated_by_id: user?.id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template eliminado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao eliminar template");
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
