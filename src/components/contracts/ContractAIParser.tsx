import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { useComplianceAI, ParsedContractData } from "@/hooks/useComplianceAI";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useCCAStatus } from "@/hooks/useCCAStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractAIParserProps {
  onDataExtracted?: (data: ParsedContractData) => void;
  contractId?: string;
  contractStoragePath?: string;
}

const tipoContratoLabels: Record<string, string> = {
  nda: "NDA",
  prestacao_servicos: "Prestação de Serviços",
  fornecimento: "Fornecimento",
  saas: "SaaS",
  arrendamento: "Arrendamento",
  trabalho: "Trabalho",
  licenciamento: "Licenciamento",
  parceria: "Parceria",
  consultoria: "Consultoria",
  outro: "Outro",
};

export function ContractAIParser({ onDataExtracted, contractId, contractStoragePath }: ContractAIParserProps) {
  const { settings } = useOrganizationSettings();
  const [textContent, setTextContent] = useState("");
  const { isLoading, parseContract } = useComplianceAI(settings?.ai_model);
  const [parsedData, setParsedData] = useState<ParsedContractData | null>(null);

  // Polling automático do estado do job CCA — arranca quando o contractId estiver disponível
  useCCAStatus(contractId);

  const handleParse = async () => {
    if (!textContent.trim()) {
      toast.error("Cole o texto do contrato antes de analisar");
      return;
    }

    const result = await parseContract(textContent.trim());
    if (result) {
      setParsedData(result);
      toast.success("Contrato analisado com sucesso!");
      if (onDataExtracted) {
        onDataExtracted(result);
      }

      // 1. Actualizar validation_status para 'validating'
      if (contractId) {
        supabase
          .from('contratos')
          .update({ validation_status: 'validating' } as any)
          .eq('id', contractId)
          .then(({ error }) => {
            if (error) console.warn('[ContractAIParser] Failed to update validation_status:', error);
          });

        // 2. Chamar o Agente CCA em background (fire and forget)
        import('@/lib/ccaAgent').then(({ callCCAAgent }) => {
          callCCAAgent({
            contractId,
            documentPath: contractStoragePath ?? '',
            extractionDraft: result as unknown as Record<string, unknown>,
          });
        }).catch(() => {
          // Silencioso — não bloquear o utilizador se o CCA falhar
        });
      }
    }
  };


  const formatCurrency = (value: number | undefined, currency = "EUR") => {
    if (value === undefined || value === null) return "N/A";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("pt-PT");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analisar Contrato com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="Cole aqui o texto do contrato para análise automática..."
              className="min-h-[200px] font-mono text-sm"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Cole o texto do contrato (pode copiar de um PDF ou documento Word)
            </p>
          </div>

          <Button onClick={handleParse} disabled={isLoading || !textContent.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A analisar...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Analisar Contrato
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Dados Extraídos
              </span>
              {parsedData.confianca && (
                <Badge variant={parsedData.confianca >= 70 ? "default" : "secondary"}>
                  Confiança: {parsedData.confianca}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Informações Básicas
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Título:</span>
                    <p className="font-medium">{parsedData.titulo_contrato || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <p className="font-medium">
                      {parsedData.tipo_contrato
                        ? tipoContratoLabels[parsedData.tipo_contrato] || parsedData.tipo_contrato
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Objeto:</span>
                    <p className="text-sm">{parsedData.objeto_resumido || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Partes Contratantes
                </h4>
                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Parte A</span>
                    <p className="font-medium">{parsedData.parte_a_nome_legal || "N/A"}</p>
                    {parsedData.parte_a_nif && (
                      <p className="text-sm text-muted-foreground">NIF: {parsedData.parte_a_nif}</p>
                    )}
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Parte B</span>
                    <p className="font-medium">{parsedData.parte_b_nome_legal || "N/A"}</p>
                    {parsedData.parte_b_nif && (
                      <p className="text-sm text-muted-foreground">NIF: {parsedData.parte_b_nif}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Datas
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Assinatura</span>
                    <p className="font-medium text-sm">{formatDate(parsedData.data_assinatura)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Início</span>
                    <p className="font-medium text-sm">{formatDate(parsedData.data_inicio_vigencia)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Termo</span>
                    <p className="font-medium text-sm">{formatDate(parsedData.data_termo)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Valores
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Valor Total:</span>
                    <p className="font-medium">
                      {formatCurrency(parsedData.valor_total_estimado)}
                    </p>
                  </div>
                </div>
              </div>

              {parsedData.clausulas_importantes && parsedData.clausulas_importantes.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Cláusulas Importantes
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {parsedData.clausulas_importantes.map((clausula, index) => (
                      <li key={index} className="text-sm">{clausula}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedData.riscos_identificados && parsedData.riscos_identificados.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Riscos Identificados
                  </h4>
                  <ul className="space-y-2">
                    {parsedData.riscos_identificados.map((risco, index) => (
                      <li
                        key={index}
                        className="text-sm p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded"
                      >
                        {risco}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
