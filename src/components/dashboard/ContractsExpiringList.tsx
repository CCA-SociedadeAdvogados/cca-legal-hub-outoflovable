import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileCheck, AlertCircle, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Contrato } from '@/hooks/useContratos';
import { TIPO_CONTRATO_LABELS } from '@/types/contracts';

interface ContractsExpiringListProps {
  contratos: Contrato[];
  maxItems?: number;
  title?: string;
}

export function ContractsExpiringList({ 
  contratos, 
  maxItems = 5, 
  title = "Contratos a Expirar" 
}: ContractsExpiringListProps) {
  const now = new Date();
  const displayedContracts = contratos.slice(0, maxItems);

  const formatValue = (value: number | null, currency: string = 'EUR') => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getDaysVariant = (days: number) => {
    if (days <= 30) return 'riskHigh';
    if (days <= 60) return 'riskMedium';
    return 'riskLow';
  };

  if (displayedContracts.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum contrato a expirar nos próximos 90 dias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent" asChild>
          <Link to="/contratos">
            Ver todos
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedContracts.map((contrato) => {
          const daysUntilExpiry = contrato.data_termo 
            ? differenceInDays(new Date(contrato.data_termo), now)
            : null;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 60;
          
          return (
            <Link
              key={contrato.id}
              to={`/contratos/${contrato.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                isExpiringSoon ? "bg-risk-medium/10" : "bg-muted"
              )}>
                {isExpiringSoon ? (
                  <AlertCircle className="h-5 w-5 text-risk-medium" />
                ) : (
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {daysUntilExpiry !== null && (
                    <Badge variant={getDaysVariant(daysUntilExpiry)} className="text-[10px]">
                      {daysUntilExpiry} dias
                    </Badge>
                  )}
                  {contrato.tipo_renovacao === 'renovacao_automatica' && (
                    <Badge variant="subtle" className="text-[10px]">
                      Renov. Auto
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-sm truncate">{contrato.titulo_contrato}</p>
                <p className="text-xs text-muted-foreground">
                  {TIPO_CONTRATO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-sm">
                  {formatValue(contrato.valor_total_estimado, contrato.moeda || 'EUR')}
                </p>
                {contrato.data_termo && (
                  <p className="text-xs text-muted-foreground">
                    até {format(new Date(contrato.data_termo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
