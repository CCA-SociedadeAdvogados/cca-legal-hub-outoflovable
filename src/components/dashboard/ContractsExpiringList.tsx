import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Calendar, AlertTriangle, AlertCircle, Eye } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Contrato } from '@/hooks/useContratos';
import { TIPO_CONTRATO_LABELS } from '@/types/contracts';

interface ContractsExpiringListProps {
  contratos: Contrato[];
  maxItems?: number;
  title?: string;
}

const formatValue = (value: number | null, currency: string = 'EUR') => {
  if (!value) return '—';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(value);
};

const getDaysVariant = (days: number) => {
  if (days <= 30) return 'riskHigh' as const;
  if (days <= 60) return 'riskMedium' as const;
  return 'riskLow' as const;
};

interface ContractItemProps {
  contrato: Contrato;
  daysUntilExpiry: number | null;
  accentClass: string;
}

function ContractItem({ contrato, daysUntilExpiry, accentClass }: ContractItemProps) {
  return (
    <Link
      to={`/contratos/${contrato.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
    >
      <div className={cn('w-0.5 h-9 rounded-full shrink-0', accentClass)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate leading-tight">{contrato.titulo_contrato}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {TIPO_CONTRATO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato}
          {contrato.parte_b_nome_legal ? ` · ${contrato.parte_b_nome_legal}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-xs font-medium tabular-nums">
            {formatValue(contrato.valor_total_estimado, contrato.moeda || 'EUR')}
          </p>
          {contrato.data_termo && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {format(new Date(contrato.data_termo), 'dd/MM/yy')}
            </p>
          )}
        </div>
        {daysUntilExpiry !== null && (
          <Badge variant={getDaysVariant(daysUntilExpiry)} className="text-[10px] tabular-nums w-10 justify-center">
            {daysUntilExpiry}d
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export function ContractsExpiringList({
  contratos,
  maxItems = 6,
  title = 'Contratos a Expirar',
}: ContractsExpiringListProps) {
  const now = new Date();
  const displayed = contratos.slice(0, maxItems);

  const getDays = (c: Contrato) =>
    c.data_termo ? differenceInDays(new Date(c.data_termo), now) : null;

  const critical = displayed.filter((c) => {
    const d = getDays(c);
    return d !== null && d <= 30;
  });
  const warning = displayed.filter((c) => {
    const d = getDays(c);
    return d !== null && d > 30 && d <= 60;
  });
  const watch = displayed.filter((c) => {
    const d = getDays(c);
    return d !== null && d > 60;
  });

  if (displayed.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum contrato a expirar nos próximos 90 dias</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent h-7 text-xs" asChild>
          <Link to="/contratos">
            Ver todos
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {critical.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
              <span className="text-xs font-semibold text-risk-high uppercase tracking-wide">Crítico</span>
              <span className="text-xs text-muted-foreground ml-1">≤ 30 dias · {critical.length}</span>
            </div>
            {critical.map((c) => (
              <ContractItem
                key={c.id}
                contrato={c}
                daysUntilExpiry={getDays(c)}
                accentClass="bg-risk-high"
              />
            ))}
          </div>
        )}

        {warning.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-risk-medium" />
              <span className="text-xs font-semibold text-risk-medium uppercase tracking-wide">Atenção</span>
              <span className="text-xs text-muted-foreground ml-1">31–60 dias · {warning.length}</span>
            </div>
            {warning.map((c) => (
              <ContractItem
                key={c.id}
                contrato={c}
                daysUntilExpiry={getDays(c)}
                accentClass="bg-risk-medium"
              />
            ))}
          </div>
        )}

        {watch.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Eye className="h-3.5 w-3.5 text-risk-low" />
              <span className="text-xs font-semibold text-risk-low uppercase tracking-wide">A Monitorar</span>
              <span className="text-xs text-muted-foreground ml-1">61–90 dias · {watch.length}</span>
            </div>
            {watch.map((c) => (
              <ContractItem
                key={c.id}
                contrato={c}
                daysUntilExpiry={getDays(c)}
                accentClass="bg-risk-low"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
