import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface Assinante {
  nome: string;
  email: string;
  assinado: boolean;
  data_assinatura?: string;
}

export interface DocumentoGerado {
  id: string;
  organization_id: string | null;
  nome: string;
  tipo: string;
  url_ficheiro: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  estado_assinatura: string;
  assinantes: Assinante[] | null;
  template_id: string | null;
  contrato_id: string | null;
  modulo: string;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

function parseAssinantes(json: Json | null): Assinante[] | null {
  if (!json || !Array.isArray(json)) return null;
  return json as unknown as Assinante[];
}

export function useDocumentosGerados(options?: { modulo?: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos-gerados", profile?.current_organization_id, options?.modulo],
    queryFn: async () => {
      let query = supabase
        .from("documentos_gerados")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by module if specified
      if (options?.modulo) {
        query = query.eq("modulo", options.modulo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((d) => ({
        ...d,
        assinantes: parseAssinantes(d.assinantes),
      })) as DocumentoGerado[];
    },
    enabled: !!profile?.current_organization_id,
  });

  const createDocumento = useMutation({
    mutationFn: async (data: {
      nome: string;
      tipo?: string;
      url_ficheiro?: string;
      tamanho_bytes?: number;
      mime_type?: string;
      template_id?: string;
      contrato_id?: string;
      modulo?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("documentos_gerados")
        .insert({
          ...data,
          organization_id: profile?.current_organization_id,
          created_by_id: user?.id,
          modulo: data.modulo || 'ASSINATURA',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-gerados"] });
      toast.success("Documento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar documento");
    },
  });

  const updateDocumento = useMutation({
    mutationFn: async ({
      id,
      assinantes,
      ...rest
    }: {
      id: string;
      nome?: string;
      tipo?: string;
      estado_assinatura?: string;
      assinantes?: Assinante[];
    }) => {
      const updateData: Record<string, unknown> = { ...rest };
      if (assinantes !== undefined) {
        updateData.assinantes = assinantes as unknown as Json;
      }
      
      const { data: result, error } = await supabase
        .from("documentos_gerados")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-gerados"] });
      toast.success("Documento atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar documento");
    },
  });

  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentos_gerados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-gerados"] });
      toast.success("Documento eliminado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao eliminar documento");
    },
  });

  const sendForSignature = useMutation({
    mutationFn: async ({
      id,
      assinantes,
      prazo_dias,
    }: {
      id: string;
      assinantes: { nome: string; email: string }[];
      prazo_dias: number;
    }) => {
      const assinantesFormatted = assinantes.map((a) => ({
        ...a,
        assinado: false,
      }));

      const { data: result, error } = await supabase
        .from("documentos_gerados")
        .update({
          estado_assinatura: "enviado",
          assinantes: assinantesFormatted,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-gerados"] });
      toast.success("Documento enviado para assinatura!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar para assinatura");
    },
  });

  return {
    documentos,
    isLoading,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    sendForSignature,
  };
}
