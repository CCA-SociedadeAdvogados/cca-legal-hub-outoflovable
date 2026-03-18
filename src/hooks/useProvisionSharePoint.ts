import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProvisionSharePointResult {
  success: boolean;
  root_folder_url: string;
  contratos_folder_url: string;
  financeiro_folder_url: string;
  correspondencia_folder_url: string;
  legalbi_folder_url: string;
  root_folder_path: string;
}

export function useProvisionSharePoint() {
  const queryClient = useQueryClient();

  const provision = useMutation({
    mutationFn: async ({
      organizationId,
      clientCode,
      clientName,
    }: {
      organizationId: string;
      clientCode: string;
      clientName: string;
    }): Promise<ProvisionSharePointResult> => {
      const { data, error } = await supabase.functions.invoke("provision-client-sharepoint", {
        body: {
          organization_id: organizationId,
          client_code: clientCode,
          client_name: clientName,
        },
      });

      if (error) {
        let msg = error.message;
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* use original */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as ProvisionSharePointResult;
    },
    onSuccess: (_data, vars) => {
      // Invalidar queries afectadas
      queryClient.invalidateQueries({ queryKey: ["sharepoint-config", vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("SharePoint provisionado com sucesso! LegalBI configurado automaticamente.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao provisionar SharePoint");
    },
  });

  return { provision };
}
