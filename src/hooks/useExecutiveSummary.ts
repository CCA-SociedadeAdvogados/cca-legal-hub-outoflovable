import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExecutiveSummaryData {
  o_que_e: string;
  partes: string;
  o_que_importa: string[];
  datas_importantes: string[];
  valor: string | null;
  proxima_acao: string | null;
  alertas: string[];
}

export function useExecutiveSummary(contractId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["executive-summary", contractId],
    enabled: !!contractId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ExecutiveSummaryData | null> => {
      const { data, error } = await supabase
        .from("contract_extractions")
        .select("extraction_data")
        .eq("contrato_id", contractId!)
        .eq("source", "executive_summary")
        .maybeSingle();

      if (error) throw error;
      return (data?.extraction_data as unknown as ExecutiveSummaryData) ?? null;
    },
  });

  const generate = useMutation({
    mutationFn: async (forceRegenerate = false) => {
      const { data, error } = await supabase.functions.invoke("executive-summary", {
        body: { contract_id: contractId, force_regenerate: forceRegenerate },
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
      return data.data as ExecutiveSummaryData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executive-summary", contractId] });
      toast.success("Resumo executivo gerado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao gerar resumo");
    },
  });

  return { summary, isLoading, generate };
}
