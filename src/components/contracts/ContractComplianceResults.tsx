import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Scale,
  ClipboardList,
  Sparkles,
  Clock,
  Lightbulb,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useContractComplianceAnalysis } from '@/hooks/useContractComplianceAnalysis';

interface ContractComplianceResultsProps {
  contratoId: string;
}

const statusConfig = {
  conforme: {
    icon: CheckCircle2,
    color: 'text-positive',
    bg: 'bg-positive/10',
    label: 'Conforme',
    badge: 'bg-positive/15 text-positive border-positive/30',
  },
  parcialmente_conforme: {
    icon: AlertTriangle,
    color: 'text-warn',
    bg: 'bg-warn/10',
    label: 'Parcialmente Conforme',
    badge: 'bg-warn/15 text-warn border-warn/30',
  },
  nao_conforme: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger/10',
    label: 'Não Conforme',
    badge: 'bg-danger/15 text-danger border-danger/30',
  },
  nao_aplicavel: {
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Não Aplicável',
    badge: 'bg-bg-alt text-ink-mute border-line',
  },
};

const prioridadeConfig = {
  alta: { bg: 'bg-danger/15 text-danger border border-danger/30' },
  media: { bg: 'bg-warn/15 text-warn border border-warn/30' },
  baixa: { bg: 'bg-brand/[0.08] text-brand border border-brand/30' },
};

export function ContractComplianceResults({ contratoId }: ContractComplianceResultsProps) {
  const { analysis, isLoading } = useContractComplianceAnalysis(contratoId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />A carregar análise...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Análise de Conformidade IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Sem análise disponível</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                Este contrato ainda não foi analisado pela IA. Execute uma análise de conformidade
                para verificar automaticamente a conformidade com a legislação aplicável.
              </p>
              <Button asChild size="sm">
                <Link to={`/contratos/${contratoId}/editar`}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ir para Análise
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const globalStatusConfig = analysis.status_global
    ? statusConfig[analysis.status_global]
    : statusConfig.nao_aplicavel;
  const GlobalStatusIcon = globalStatusConfig.icon;

  // Get non-conforming and partially conforming events for quick view
  const issuesEvents = analysis.eventos_verificados.filter(
    (e) =>
      e.status_conformidade === 'nao_conforme' || e.status_conformidade === 'parcialmente_conforme',
  );

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Resultado da Análise de Conformidade
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(analysis.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: pt,
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Status */}
          <Alert className={globalStatusConfig.bg}>
            <GlobalStatusIcon className={`h-5 w-5 ${globalStatusConfig.color}`} />
            <AlertTitle className="text-lg">{globalStatusConfig.label}</AlertTitle>
            <AlertDescription className="mt-2">{analysis.resumo_contrato}</AlertDescription>
          </Alert>

          {/* Statistics Grid */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{analysis.sumario_geral.total_eventos}</p>
              <p className="text-sm text-muted-foreground">Total Verificados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-positive/10">
              <p className="text-2xl font-bold text-positive">{analysis.sumario_geral.conformes}</p>
              <p className="text-sm text-muted-foreground">Conformes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-warn/10">
              <p className="text-2xl font-bold text-warn">
                {analysis.sumario_geral.parcialmente_conformes}
              </p>
              <p className="text-sm text-muted-foreground">Parcialmente</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-danger/10">
              <p className="text-2xl font-bold text-danger">
                {analysis.sumario_geral.nao_conformes}
              </p>
              <p className="text-sm text-muted-foreground">Não Conformes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-muted-foreground">
                {analysis.sumario_geral.nao_aplicaveis}
              </p>
              <p className="text-sm text-muted-foreground">N/A</p>
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Confiança da análise:</span>
            <Progress value={analysis.confianca || 0} className="h-2 w-32" />
            <span className="text-sm font-medium">{analysis.confianca}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Issues Quick View */}
      {issuesEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warn" />
              Pontos de Atenção ({issuesEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {issuesEvents.map((evento, index) => {
                  const config =
                    statusConfig[evento.status_conformidade] || statusConfig.nao_aplicavel;
                  const StatusIcon = config.icon;
                  const prioridade = prioridadeConfig[evento.prioridade] || prioridadeConfig.media;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${config.bg}`}
                      style={{ borderLeftColor: 'currentColor' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <StatusIcon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                          <div>
                            <p className="font-medium text-sm">{evento.evento_titulo}</p>
                            <p className="text-xs text-muted-foreground">{evento.area_direito}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge className={`text-xs ${config.badge}`}>{config.label}</Badge>
                          <Badge className={`text-xs ${prioridade.bg}`}>{evento.prioridade}</Badge>
                        </div>
                      </div>
                      {evento.gaps_identificados.length > 0 && (
                        <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                          {evento.gaps_identificados.slice(0, 2).map((gap, i) => (
                            <li key={i}>{gap}</li>
                          ))}
                          {evento.gaps_identificados.length > 2 && (
                            <li className="text-muted-foreground">
                              +{evento.gaps_identificados.length - 2} mais...
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recomendacoes_gerais && analysis.recomendacoes_gerais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-brand" />
              Recomendações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recomendacoes_gerais.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-brand shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {analysis.proximos_passos && analysis.proximos_passos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.proximos_passos.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Re-analyze button */}
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link to={`/contratos/${contratoId}/editar`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Re-analisar Contrato
          </Link>
        </Button>
      </div>
    </div>
  );
}
