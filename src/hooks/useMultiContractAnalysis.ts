import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MultiContractResult {
  answer: string;
  referenced_contracts: Array<{ id: string; id_interno: string; titulo: string }>;
  contracts_analyzed: number;
  question: string;
  timestamp: Date;
}

export function useMultiContractAnalysis(organizationId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MultiContractResult[]>([]);

  const analyze = useCallback(async (question: string) => {
    if (!organizationId || !question.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("multi-contract-analysis", {
        body: { organization_id: organizationId, question: question.trim() },
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

      const result: MultiContractResult = {
        answer: data.answer,
        referenced_contracts: data.referenced_contracts || [],
        contracts_analyzed: data.contracts_analyzed || 0,
        question: question.trim(),
        timestamp: new Date(),
      };

      setResults((prev) => [result, ...prev]);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro na análise de portefólio";
      console.error("[useMultiContractAnalysis] Error:", error);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, isLoading]);

  const clearResults = useCallback(() => setResults([]), []);

  return { results, isLoading, analyze, clearResults };
}
