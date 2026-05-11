import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRedlineContract, ClauseClassification } from '@/hooks/useRedlineContract';
import {
  Gavel,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractRedlineProps {
  contractId: string;
}

const CLASSIFICATION_CONFIG: Record<
  ClauseClassification,
  {
    label: string;
    color: string;
    icon: React.ElementType;
  }
> = {
  favoravel: {
    label: 'Favorável',
    color: 'text-positive bg-positive/10 border-positive/30',
    icon: TrendingUp,
  },
  standard: { label: 'Standard', color: 'text-brand bg-brand/[0.08] border-brand/30', icon: Minus },
  atencao: {
    label: 'Atenção',
    color: 'text-warn bg-warn/10 border-warn/30',
    icon: AlertTriangle,
  },
  risco: { label: 'Risco', color: 'text-danger bg-danger/10 border-danger/30', icon: TrendingDown },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? 'text-positive' : score >= 50 ? 'text-warn' : 'text-danger';
  return (
    <div className="flex items-center gap-3">
      <div className={cn('text-3xl font-bold', color)}>{score}</div>
      <div>
        <p className="text-xs text-muted-foreground">Score</p>
        <p className="text-xs font-medium">
          {score >= 75 ? 'Bom' : score >= 50 ? 'Razoável' : 'Fraco'}
        </p>
      </div>
    </div>
  );
}

export function ContractRedline({ contractId }: ContractRedlineProps) {
  const { redline, isLoading, analyze } = useRedlineContract(contractId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!redline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            Análise de Cláusulas (Redlining)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Analise cada cláusula do contrato quanto ao risco e equilíbrio. Identifica cláusulas
            desequilibradas e sugere alternativas.
          </p>
          <Button size="sm" onClick={() => analyze.mutate(false)} disabled={analyze.isPending}>
            {analyze.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A analisar...
              </>
            ) : (
              <>
                <Gavel className="mr-2 h-4 w-4" />
                Analisar Cláusulas
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    favoravel: redline.clausulas.filter((c) => c.classificacao === 'favoravel').length,
    standard: redline.clausulas.filter((c) => c.classificacao === 'standard').length,
    atencao: redline.clausulas.filter((c) => c.classificacao === 'atencao').length,
    risco: redline.clausulas.filter((c) => c.classificacao === 'risco').length,
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" />
              Análise de Cláusulas
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyze.mutate(true)}
              disabled={analyze.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${analyze.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6 mb-4">
            <ScoreRing score={redline.score_geral} />
            <div className="flex gap-3">
              {(['favoravel', 'standard', 'atencao', 'risco'] as ClauseClassification[]).map(
                (c) => (
                  <div key={c} className="text-center">
                    <div
                      className={cn(
                        'text-lg font-bold',
                        c === 'favoravel'
                          ? 'text-positive'
                          : c === 'standard'
                            ? 'text-brand'
                            : c === 'atencao'
                              ? 'text-warn'
                              : 'text-danger',
                      )}
                    >
                      {stats[c]}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {CLASSIFICATION_CONFIG[c].label}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{redline.sumario}</p>
        </CardContent>
      </Card>

      {/* Cláusulas */}
      <div className="space-y-2">
        {redline.clausulas.map((clause, i) => {
          const config = CLASSIFICATION_CONFIG[clause.classificacao];
          const Icon = config.icon;
          return (
            <div key={i} className={cn('rounded-lg border p-4', config.color)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-sm">{clause.titulo}</span>
                </div>
                <Badge variant="outline" className={cn('text-xs shrink-0', config.color)}>
                  {config.label}
                </Badge>
              </div>
              {clause.texto_original && (
                <p className="text-xs italic mb-2 opacity-75">
                  &quot;{clause.texto_original}&quot;
                </p>
              )}
              <p className="text-xs">{clause.justificacao}</p>
              {clause.sugestao && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <p className="text-xs font-medium mb-1">Sugestão alternativa:</p>
                  <p className="text-xs italic">{clause.sugestao}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pontos positivos/negativos */}
      <div className="grid gap-4 md:grid-cols-2">
        {redline.pontos_positivos?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-positive" />
                Pontos Positivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {redline.pontos_positivos.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-positive shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {redline.pontos_negativos?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-danger" />
                Riscos Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {redline.pontos_negativos.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3 w-3 text-danger shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recomendações */}
      {redline.recomendacoes_negociacao?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recomendações de Negociação</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1">
              {redline.recomendacoes_negociacao.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-bold text-muted-foreground shrink-0">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
