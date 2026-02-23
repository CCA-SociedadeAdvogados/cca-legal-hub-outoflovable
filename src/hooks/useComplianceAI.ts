import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContractImpact {
  contrato_id: string;
  contrato_titulo: string;
  nivel_risco: "baixo" | "medio" | "alto";
  motivo_impacto: string;
  acoes_recomendadas: string[];
  prazo_sugerido: string;
  clausulas_a_rever: string[];
}

export interface EventImpactAnalysis {
  resumo_evento: string;
  areas_afetadas: string[];
  contratos_impactados: ContractImpact[];
  contratos_nao_impactados: string[];
  recomendacoes_gerais: string[];
  confianca: number;
}

export interface ComplianceAction {
  acao: string;
  prioridade: "alta" | "media" | "baixa";
  prazo: string;
  responsavel_sugerido: string;
}

export interface ContractComplianceDetail {
  contrato_id: string;
  contrato_titulo: string;
  status_conformidade: "conforme" | "parcialmente_conforme" | "nao_conforme";
  pontos_conformes: string[];
  pontos_nao_conformes: string[];
  acoes_corretivas: ComplianceAction[];
  texto_adenda_sugerido: string | null;
}

export interface ComplianceCheckResult {
  analise_detalhada: ContractComplianceDetail[];
  sumario_executivo: string;
  proximos_passos: string[];
}

export interface ParsedContractData {
  titulo_contrato?: string;
  tipo_contrato?: string;
  objeto_resumido?: string;
  parte_a_nome_legal?: string;
  parte_a_nif?: string;
  parte_b_nome_legal?: string;
  parte_b_nif?: string;
  data_assinatura?: string;
  data_inicio_vigencia?: string;
  data_termo?: string;
  valor_total_estimado?: number;
  clausulas_importantes?: string[];
  riscos_identificados?: string[];
  confianca?: number;
}

export function useComplianceAI(aiModel?: string) {
  const [isLoading, setIsLoading] = useState(false);

  const parseContract = async (textContent: string): Promise<ParsedContractData | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-compliance", {
        body: {
          type: "parse_contract",
          data: { textContent },
          model: aiModel,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.data as ParsedContractData;
    } catch (error: any) {
      console.error("Error parsing contract:", error);
      toast.error(error.message || "Erro ao analisar contrato");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeEventImpact = async (eventoId: string): Promise<EventImpactAnalysis | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-compliance", {
        body: {
          type: "analyze_event_impact",
          data: { eventoId },
          model: aiModel,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.data as EventImpactAnalysis;
    } catch (error: any) {
      console.error("Error analyzing event impact:", error);
      toast.error(error.message || "Erro ao analisar impacto");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const checkCompliance = async (
    eventoId: string,
    contratoIds: string[]
  ): Promise<ComplianceCheckResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-compliance", {
        body: {
          type: "compliance_check",
          data: { eventoId, contratoIds },
          model: aiModel,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.data as ComplianceCheckResult;
    } catch (error: any) {
      console.error("Error checking compliance:", error);
      toast.error(error.message || "Erro ao verificar conformidade");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    parseContract,
    analyzeEventImpact,
    checkCompliance,
  };
}
