import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { FileText, Euro, Scale, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useEventosLegislativos } from '@/hooks/useEventosLegislativos';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { CCACardHeader, Pill } from '@/components/cca';

interface MonthlySummaryWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const formatEUR = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const MonthlySummaryWidget = forwardRef<HTMLDivElement, MonthlySummaryWidgetProps>(
  function MonthlySummaryWidget({ title }, ref) {
    const { t, i18n } = useTranslation();
    const { contratos, isLoading: isLoadingContratos } = useContratos();
    const { financialSummary, isLoading: isLoadingFinanceiro } = useFinanceiro();
    const { eventos, isLoading: isLoadingEventos } = useEventosLegislativos();

    const dateLocale = i18n.language === 'pt' ? pt : enUS;

    const summary = useMemo(() => {
      const now = new Date();
      const interval = { start: startOfMonth(now), end: endOfMonth(now) };
      const list = contratos?.filter((c) => !c.arquivado) ?? [];

      const createdThisMonth = list.filter(
        (c) => c.created_at && isWithinInterval(new Date(c.created_at), interval),
      ).length;

      const terminatedThisMonth = list.filter(
        (c) =>
          c.data_termo &&
          isWithinInterval(new Date(c.data_termo), interval) &&
          ['expirado', 'rescindido', 'denunciado'].includes(c.estado_contrato),
      ).length;

      const renewedThisMonth = list.filter(
        (c) =>
          c.data_inicio_vigencia &&
          isWithinInterval(new Date(c.data_inicio_vigencia), interval) &&
          c.created_at &&
          !isWithinInterval(new Date(c.created_at), interval) &&
          c.estado_contrato === 'activo',
      ).length;

      const eventsThisMonth = (eventos ?? []).filter(
        (e) => e.data_publicacao && isWithinInterval(new Date(e.data_publicacao), interval),
      ).length;

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
        totalActive: list.filter((c) => c.estado_contrato === 'activo').length,
      };
    }, [contratos, eventos, financialSummary, dateLocale]);

    const isLoading = isLoadingContratos || isLoadingFinanceiro || isLoadingEventos;

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Mês" title={title} />
          <div className="space-y-2 px-5 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between">
                <div className="h-4 w-1/2 rounded bg-bg-alt" />
                <div className="h-5 w-12 rounded bg-bg-alt" />
              </div>
            ))}
          </div>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CCACardHeader
          eyebrow="Resumo mensal"
          title={title}
          action={
            <span className="font-mono text-[11px] uppercase text-ink-mute">{summary.month}</span>
          }
        />
        <div className="space-y-3 px-5 py-4">
          <SummaryRow
            icon={<FileText className="h-3.5 w-3.5 text-ink-mute" strokeWidth={1.5} />}
            label={t('monthlySummary.activeContracts', 'Contratos activos')}
            value={<Pill tone="positive">{summary.totalActive}</Pill>}
          />
          <SummaryRow
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-positive" strokeWidth={1.5} />}
            label={t('monthlySummary.createdThisMonth')}
            value={<Pill tone="default">{summary.createdThisMonth}</Pill>}
          />
          {summary.terminatedThisMonth > 0 && (
            <SummaryRow
              icon={<AlertTriangle className="h-3.5 w-3.5 text-danger" strokeWidth={1.5} />}
              label={t('monthlySummary.terminatedThisMonth')}
              value={<Pill tone="danger">{summary.terminatedThisMonth}</Pill>}
            />
          )}
          {summary.renewedThisMonth > 0 && (
            <SummaryRow
              icon={<RotateCcw className="h-3.5 w-3.5 text-brand" strokeWidth={1.5} />}
              label={t('monthlySummary.renewedThisMonth')}
              value={<Pill tone="active">{summary.renewedThisMonth}</Pill>}
            />
          )}
          {summary.eventsThisMonth > 0 && (
            <SummaryRow
              icon={<Scale className="h-3.5 w-3.5 text-ink-mute" strokeWidth={1.5} />}
              label={t('monthlySummary.legislativeEvents')}
              value={<Pill tone="default">{summary.eventsThisMonth}</Pill>}
            />
          )}
          {summary.totalPendente > 0 && (
            <>
              <div className="border-t border-line-soft pt-3" />
              <SummaryRow
                icon={<Euro className="h-3.5 w-3.5 text-warn" strokeWidth={1.5} />}
                label={t('monthlySummary.financialPending')}
                value={
                  <span className="font-mono text-[12px] font-medium text-ink">
                    {formatEUR(summary.totalPendente)}
                  </span>
                }
              />
              {summary.totalVencido > 0 && (
                <SummaryRow
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-danger" strokeWidth={1.5} />}
                  label={t('monthlySummary.financialOverdue')}
                  value={
                    <span className="font-mono text-[12px] font-medium text-danger">
                      {formatEUR(summary.totalVencido)}
                    </span>
                  }
                />
              )}
            </>
          )}
        </div>
      </Card>
    );
  },
);

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-soft">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

export default MonthlySummaryWidget;
