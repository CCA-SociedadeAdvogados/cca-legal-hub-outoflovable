import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { useComplianceAI, EventImpactAnalysis, ContractImpact } from "@/hooks/useComplianceAI";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface EventImpactAnalyzerProps {
  eventoId: string;
  eventoTitulo: string;
}

const riskColors = {
  baixo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medio: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  alto: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const riskLabels = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export function EventImpactAnalyzer({ eventoId, eventoTitulo }: EventImpactAnalyzerProps) {
  const { settings } = useOrganizationSettings();
  const { isLoading, analyzeEventImpact } = useComplianceAI(settings?.ai_model);
  const [analysis, setAnalysis] = useState<EventImpactAnalysis | null>(null);

  const handleAnalyze = async () => {
    const result = await analyzeEventImpact(eventoId);
    if (result) {
      setAnalysis(result);
      toast.success("Análise de impacto concluída!");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise de Impacto com IA
          </CardTitle>
          <CardDescription>
            Analise automaticamente quais contratos são afetados por este evento legislativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A analisar contratos...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analisar Impacto nos Contratos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumo da Análise</span>
                <Badge variant="outline">Confiança: {analysis.confianca}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{analysis.resumo_evento}</p>

              <div>
                <h4 className="text-sm font-semibold mb-2">Áreas Afetadas</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.areas_afetadas.map((area, i) => (
                    <Badge key={i} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Recomendações Gerais</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {analysis.recomendacoes_gerais.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Impacted Contracts */}
          {analysis.contratos_impactados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Contratos Impactados ({analysis.contratos_impactados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.contratos_impactados.map((contract) => (
                    <ImpactedContractCard key={contract.contrato_id} contract={contract} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Non-impacted Contracts */}
          {analysis.contratos_nao_impactados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Contratos Não Impactados ({analysis.contratos_nao_impactados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {analysis.contratos_nao_impactados.length} contratos não requerem alterações
                  relacionadas a este evento legislativo.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ImpactedContractCard({ contract }: { contract: ContractImpact }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={`/contratos/${contract.contrato_id}`}
            className="font-medium hover:text-primary flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {contract.contrato_titulo}
          </Link>
          <p className="text-sm text-muted-foreground mt-1">{contract.motivo_impacto}</p>
        </div>
        <Badge className={riskColors[contract.nivel_risco]}>
          Risco {riskLabels[contract.nivel_risco]}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Prazo sugerido: {contract.prazo_sugerido}</span>
      </div>

      {contract.clausulas_a_rever.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
            Cláusulas a Rever
          </h5>
          <div className="flex flex-wrap gap-1">
            {contract.clausulas_a_rever.map((clausula, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {clausula}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
          Ações Recomendadas
        </h5>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {contract.acoes_recomendadas.map((acao, i) => (
            <li key={i}>{acao}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
