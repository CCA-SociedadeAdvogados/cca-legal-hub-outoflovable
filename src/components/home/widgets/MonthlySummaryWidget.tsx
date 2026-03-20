import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, FileText, Euro, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useEventosLegislativos } from '@/hooks/useEventosLegislativos';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface MonthlySummaryWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const MonthlySummaryWidget = forwardRef<HTMLDivElement, MonthlySummaryWidgetProps>(
  function MonthlySummaryWidget({ title }, ref) {
    const { t, i18n } = useTranslation();
    const { contratos, isLoading: isLoadingContratos } = useContratos();
    const { financialSummary, isLoading: isLoadingFinanceiro } = useFinanceiro();
    const { eventos, isLoading: isLoadingEventos } = useEventosLegislativos();

    const dateLocale = i18n.language === 'pt' ? pt : enUS;

    const summary = useMemo(() => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const interval = { start: monthStart, end: monthEnd };

      const list = contratos?.filter(c => !c.arquivado) ?? [];

      // Contracts created this month
      const createdThisMonth = list.filter(c => c.created_at && isWithinInterval(new Date(c.created_at), interval)).length;

      // Contracts expired or terminated this month
      const terminatedThisMonth = list.filter(c =>
        c.data_termo &&
        isWithinInterval(new Date(c.data_termo), interval) &&
        ['expirado', 'rescindido', 'denunciado'].includes(c.estado_contrato)
      ).length;

      // Renewed this month: contracts that became active this month (data_inicio_vigencia within
      // current month) but were created before this month — best available proxy for renewals
      const renewedThisMonth = list.filter(c =>
        c.data_inicio_vigencia &&
        isWithinInterval(new Date(c.data_inicio_vigencia), interval) &&
        c.created_at &&
        !isWithinInterval(new Date(c.created_at), interval) &&
        c.estado_contrato === 'activo'
      ).length;

      // Events published this month
      const eventsThisMonth = (eventos ?? []).filter(e =>
        e.data_publicacao && isWithinInterval(new Date(e.data_publicacao), interval)
      ).length;

      // Financial
      const totalPendente = Number(financialSummary?.total_pendente ?? 0);
      const totalVencido = Number(financialSummary?.total_vencido ?? 0);

      return {
        month: format(now, 'MMMM yyyy', { locale: dateLocale }),
        createdThisMonth,
        terminatedThisMonth,
        renewedThisMonth,
        eventsThisMonth,
        totalPendente,
        totalVencido,
        totalActive: list.filter(c => c.estado_contrato === 'activo').length,
      };
    }, [contratos, eventos, financialSummary, dateLocale]);

    const isLoading = isLoadingContratos || isLoadingFinanceiro || isLoadingEventos;

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground capitalize">{summary.month}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t('monthlySummary.activeContracts', 'Contratos activos')}</span>
            </div>
            <Badge variant="secondary">{summary.totalActive}</Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('monthlySummary.createdThisMonth')}</span>
            </div>
            <Badge variant="secondary">{summary.createdThisMonth}</Badge>
          </div>

          {summary.terminatedThisMonth > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span>{t('monthlySummary.terminatedThisMonth')}</span>
              </div>
              <Badge variant="destructive">{summary.terminatedThisMonth}</Badge>
            </div>
          )}

          {summary.renewedThisMonth > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>{t('monthlySummary.renewedThisMonth')}</span>
              </div>
              <Badge variant="secondary">{summary.renewedThisMonth}</Badge>
            </div>
          )}

          {summary.eventsThisMonth > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5 text-purple-500" />
                <span>{t('monthlySummary.legislativeEvents')}</span>
              </div>
              <Badge variant="secondary">{summary.eventsThisMonth}</Badge>
            </div>
          )}

          {summary.totalPendente > 0 && (
            <>
              <div className="border-t pt-2" />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t('monthlySummary.financialPending')}</span>
                </div>
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(summary.totalPendente)}
                </span>
              </div>
              {summary.totalVencido > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('monthlySummary.financialOverdue')}</span>
                  </div>
                  <span className="text-sm font-medium text-red-500">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(summary.totalVencido)}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);

export default MonthlySummaryWidget;
