import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export interface Requisito {
  id: string;
  organization_id: string | null;
  titulo: string;
  descricao: string | null;
  fonte_legal: string | null;
  area_direito: string;
  prazo_cumprimento: string | null;
  estado: string;
  nivel_criticidade: string;
  evento_legislativo_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

export function useRequisitos() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: requisitos = [], isLoading } = useQuery({
    queryKey: ["requisitos", profile?.current_organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisitos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Requisito[];
    },
    enabled: !!profile?.current_organization_id,
  });

  const createRequisito = useMutation({
    mutationFn: async (data: {
      titulo: string;
      descricao?: string;
      fonte_legal?: string;
      area_direito?: string;
      prazo_cumprimento?: string;
      estado?: string;
      nivel_criticidade?: string;
      evento_legislativo_id?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("requisitos")
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
      queryClient.invalidateQueries({ queryKey: ["requisitos"] });
      toast.success("Requisito criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar requisito");
    },
  });

  const updateRequisito = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      titulo?: string;
      descricao?: string;
      fonte_legal?: string;
      area_direito?: string;
      prazo_cumprimento?: string;
      estado?: string;
      nivel_criticidade?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("requisitos")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitos"] });
      toast.success("Requisito atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar requisito");
    },
  });

  const deleteRequisito = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("requisitos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitos"] });
      toast.success("Requisito eliminado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao eliminar requisito");
    },
  });

  return {
    requisitos,
    isLoading,
    createRequisito,
    updateRequisito,
    deleteRequisito,
  };
}
