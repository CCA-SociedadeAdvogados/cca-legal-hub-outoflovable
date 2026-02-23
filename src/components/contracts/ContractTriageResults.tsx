import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Clock, 
  Bot,
  Shield,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useContractTriage } from '@/hooks/useContractTriage';
import { TriageAuditBadge } from './TriageAuditBadge';

interface ContractTriageResultsProps {
  contratoId: string;
}

function getRiskBadgeVariant(nivel: string): 'destructive' | 'riskMedium' | 'active' | 'secondary' {
  switch (nivel?.toLowerCase()) {
    case 'critico':
    case 'alto':
      return 'destructive';
    case 'medio':
      return 'riskMedium';
    case 'baixo':
      return 'active';
    default:
      return 'secondary';
  }
}

function getRiskIcon(nivel: string) {
  switch (nivel?.toLowerCase()) {
    case 'critico':
    case 'alto':
      return <XCircle className="h-4 w-4" />;
    case 'medio':
      return <AlertTriangle className="h-4 w-4" />;
    case 'baixo':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

export function ContractTriageResults({ contratoId }: ContractTriageResultsProps) {
  const { analysis, isLoading, runTriage, isRunning } = useContractTriage(contratoId);

  const handleRunTriage = () => {
    runTriage.mutate(contratoId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            CCA AI Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Este contrato ainda não foi analisado pelo agente de triagem.
            </p>
            <Button onClick={handleRunTriage} disabled={isRunning}>
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Executar Análise de Triagem
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Audit Trail Badge */}
      <TriageAuditBadge
        analysisId={analysis.analysis_id}
        analyzedAt={analysis.analyzed_at}
        aiModel={analysis.ai_model_used || 'openai/gpt-5'}
        textSource={analysis.text_source}
        textLength={analysis.text_length}
      />

      {/* Header with score */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5" />
              CCA AI Agent
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleRunTriage} disabled={isRunning}>
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Reanalisar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.score_global)}`}>
                {analysis.score_global.toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">Score de Conformidade</p>
              <Progress 
                value={analysis.score_global} 
                className="mt-2 h-2"
              />
            </div>

            {/* Risk Level */}
            <div className="text-center">
              <Badge 
                variant={getRiskBadgeVariant(analysis.nivel_risco_global)} 
                className="text-lg px-4 py-1"
              >
                {getRiskIcon(analysis.nivel_risco_global)}
                <span className="ml-2 capitalize">{analysis.nivel_risco_global}</span>
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">Nível de Risco Global</p>
            </div>

            {/* Source Info */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">
                  {analysis.text_source === 'pdf' ? 'Extraído de PDF' : 'Campos da BD'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analysis.text_length.toLocaleString()} caracteres analisados
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(analysis.analyzed_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                </span>
              </div>
            </div>
          </div>

          {/* Contract Type */}
          {analysis.tipo_contrato && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Tipo de Contrato Identificado:</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {analysis.tipo_contrato.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executive Summary */}
      {analysis.resumo_executivo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.resumo_executivo}</p>
          </CardContent>
        </Card>
      )}

      {/* Clause Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Red Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Red Flags Prioritários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.red_flags_prioritarios && analysis.red_flags_prioritarios.length > 0 ? (
              <ul className="space-y-2">
                {analysis.red_flags_prioritarios.map((flag: any, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span>{typeof flag === 'string' ? flag : flag.descricao || flag.description || JSON.stringify(flag)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Nenhum red flag identificado</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.recomendacoes_globais && analysis.recomendacoes_globais.length > 0 ? (
              <ul className="space-y-2">
                {analysis.recomendacoes_globais.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem recomendações específicas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      {analysis.proximos_passos && analysis.proximos_passos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {analysis.proximos_passos.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Clause Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estatísticas da Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{analysis.total_clausulas_analisadas}</div>
              <p className="text-xs text-muted-foreground">Cláusulas Analisadas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="text-2xl font-bold text-green-600">{analysis.clausulas_conformes}</div>
              <p className="text-xs text-muted-foreground">Conformes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <div className="text-2xl font-bold text-yellow-600">{analysis.clausulas_alto_risco}</div>
              <p className="text-xs text-muted-foreground">Alto Risco</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="text-2xl font-bold text-red-600">{analysis.clausulas_criticas}</div>
              <p className="text-xs text-muted-foreground">Críticas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Source Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Bot className="h-3 w-3" />
        <span>Análise realizada por CCA AI Agent • Dados extraídos automaticamente do contrato</span>
      </div>
    </div>
  );
}
