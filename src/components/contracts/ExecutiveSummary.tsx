import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExecutiveSummary } from '@/hooks/useExecutiveSummary';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Euro,
  ArrowRight,
} from 'lucide-react';

interface ExecutiveSummaryProps {
  contractId: string;
}

export function ExecutiveSummary({ contractId }: ExecutiveSummaryProps) {
  const { summary, isLoading, generate } = useExecutiveSummary(contractId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Resumo Executivo IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Gere um resumo em linguagem simples, ideal para partilhar com gestores e clientes não
            jurídicos.
          </p>
          <Button size="sm" onClick={() => generate.mutate(false)} disabled={generate.isPending}>
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Resumo
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Resumo Executivo IA
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generate.mutate(true)}
            disabled={generate.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* O que é */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Em resumo</p>
          <p className="text-sm">{summary.o_que_e}</p>
        </div>

        {/* Partes */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">As partes</p>
          <p className="text-sm">{summary.partes}</p>
        </div>

        {/* O que importa */}
        {summary.o_que_importa?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">O que precisa de saber</p>
            <ul className="space-y-1">
              {summary.o_que_importa.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-positive shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Datas importantes */}
        {summary.datas_importantes?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Datas importantes</p>
            <ul className="space-y-1">
              {summary.datas_importantes.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Valor */}
        {summary.valor && (
          <div className="flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{summary.valor}</span>
          </div>
        )}

        {/* Próxima acção */}
        {summary.proxima_acao && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-primary">Próxima acção</p>
                <p className="mt-0.5">{summary.proxima_acao}</p>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {summary.alertas?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Alertas</p>
            <ul className="space-y-1">
              {summary.alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
