import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ChevronRight,
  Calendar,
  Euro,
  Building2,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import {
  TIPO_CONTRATO_LABELS,
  ESTADO_CONTRATO_LABELS,
  DEPARTAMENTO_LABELS,
} from '@/types/contracts';
import { ValidationBadge } from './ValidationBadge';

type Contrato = Tables<'contratos'>;

interface ContractCardProps {
  contract: Contrato;
}

export function ContractCard({ contract }: ContractCardProps) {
  const daysUntilExpiry = contract.data_termo
    ? differenceInDays(new Date(contract.data_termo), new Date())
    : null;

  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'active';
      case 'rascunho':
      case 'em_revisao':
      case 'em_aprovacao':
        return 'subtle';
      case 'enviado_para_assinatura':
        return 'secondary';
      case 'expirado':
      case 'rescindido':
      case 'denunciado':
        return 'riskHigh';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: contract.moeda || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tipoLabel = TIPO_CONTRATO_LABELS[contract.tipo_contrato as keyof typeof TIPO_CONTRATO_LABELS] || contract.tipo_contrato;
  const estadoLabel = ESTADO_CONTRATO_LABELS[contract.estado_contrato as keyof typeof ESTADO_CONTRATO_LABELS] || contract.estado_contrato;
  const departamentoLabel = DEPARTAMENTO_LABELS[contract.departamento_responsavel as keyof typeof DEPARTAMENTO_LABELS] || contract.departamento_responsavel;

  return (
    <Card
      className={`hover:bg-muted/30 transition-colors cursor-pointer group ${
        isExpiringSoon ? 'border-risk-medium/50' : ''
      } ${isExpired ? 'border-risk-high/50 opacity-75' : ''}`}
    >
      <Link to={`/contratos/${contract.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Badges Row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={getEstadoBadgeVariant(contract.estado_contrato) as any}>
                    {estadoLabel}
                  </Badge>
                  <Badge variant="outline">
                    {tipoLabel}
                  </Badge>
                  <Badge variant="subtle">
                    {departamentoLabel}
                  </Badge>
                  {contract.tipo_renovacao === 'renovacao_automatica' && (
                    <Badge variant="subtle" className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Renovação auto.
                    </Badge>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <Badge variant="riskMedium" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expira em {daysUntilExpiry} dias
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="riskHigh" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expirado
                    </Badge>
                  )}
                  <ValidationBadge status={(contract.validation_status ?? 'none') as any} compact />
                </div>

                {/* Title and ID */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {contract.id_interno}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                  {contract.titulo_contrato}
                </h3>

                {/* Counterparty */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Building2 className="h-4 w-4" />
                  <span>{contract.parte_b_nome_legal}</span>
                  {contract.parte_b_grupo_economico && (
                    <span className="text-xs">
                      ({contract.parte_b_grupo_economico})
                    </span>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  {contract.valor_total_estimado !== null &&
                    Number(contract.valor_total_estimado) > 0 && (
                      <div className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        {formatCurrency(Number(contract.valor_total_estimado))}
                      </div>
                    )}
                  {contract.data_inicio_vigencia && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Início:{' '}
                      {format(new Date(contract.data_inicio_vigencia), 'd MMM yyyy', {
                        locale: pt,
                      })}
                    </div>
                  )}
                  {contract.data_termo && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Termo:{' '}
                      {format(new Date(contract.data_termo), 'd MMM yyyy', {
                        locale: pt,
                      })}
                    </div>
                  )}
                </div>

                {/* Description */}
                {contract.objeto_resumido && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {contract.objeto_resumido}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
