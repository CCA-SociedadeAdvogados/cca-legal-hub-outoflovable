import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GenerateContractFields {
  parte_a_nome: string;
  parte_a_nif?: string;
  parte_b_nome: string;
  parte_b_nif?: string;
  objeto: string;
  valor?: number;
  moeda?: string;
  data_inicio?: string;
  duracao_meses?: number;
  tipo_renovacao?: string;
  notas_adicionais?: string;
  [key: string]: unknown;
}

export function useGenerateContract() {
  const generate = useMutation({
    mutationFn: async ({
      templateType,
      fields,
    }: {
      templateType: string;
      fields: GenerateContractFields;
    }): Promise<{ contractText: string; templateType: string }> => {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { template_type: templateType, fields },
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
      return { contractText: data.contract_text, templateType: data.template_type };
    },
    onSuccess: () => {
      toast.success("Contrato gerado com sucesso. Reveja antes de guardar.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao gerar contrato");
    },
  });

  return { generate };
}
