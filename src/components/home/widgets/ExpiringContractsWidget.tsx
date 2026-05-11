import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { Link } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { CCACardHeader, Pill } from '@/components/cca';

interface ExpiringContractsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const ExpiringContractsWidget = forwardRef<HTMLDivElement, ExpiringContractsWidgetProps>(
  function ExpiringContractsWidget({ title, config }, ref) {
    const { t, i18n } = useTranslation();
    const { contratos, isLoading } = useContratos();

    const daysAhead = (config.daysAhead as number) || 30;
    const dateLocale = i18n.language === 'pt' ? pt : enUS;
    const today = new Date();
    const todayStr = today.toDateString();

    const expiringContracts = useMemo(
      () => {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + daysAhead);
        return (contratos ?? [])
          .filter((c) => {
            if (!c.data_termo || c.estado_contrato !== 'activo') return false;
            const expiryDate = new Date(c.data_termo);
            return expiryDate >= now && expiryDate <= future;
          })
          .sort((a, b) => new Date(a.data_termo!).getTime() - new Date(b.data_termo!).getTime())
          .slice(0, 5);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [contratos, todayStr, daysAhead],
    );

    const viewAll = (
      <Link
        to="/contratos"
        className="inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[0.01em] text-brand hover:text-brand-strong"
      >
        {t('home.viewAll')}
        <ArrowRight className="h-3 w-3" />
      </Link>
    );

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Renovações" title={title} />
          <div className="space-y-3 px-5 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between">
                <div className="h-4 w-2/3 rounded bg-bg-alt" />
                <div className="h-5 w-16 rounded bg-bg-alt" />
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (!expiringContracts?.length) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Renovações" title={title} />
          <p className="px-5 py-5 text-[13px] text-ink-mute">
            {t('home.noExpiringContracts', { days: daysAhead })}
          </p>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CCACardHeader
          eyebrow="Renovações"
          title={
            <span className="inline-flex items-center gap-2.5">
              {title}
              <Pill tone="warn">{expiringContracts.length}</Pill>
            </span>
          }
          action={viewAll}
        />
        <ul className="divide-y divide-line-soft">
          {expiringContracts.map((contract) => {
            const daysUntilExpiry = differenceInDays(new Date(contract.data_termo!), today);
            const isUrgent = daysUntilExpiry <= 7;
            return (
              <li key={contract.id}>
                <Link
                  to={`/contratos/${contract.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-alt"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14px] font-medium leading-tight text-ink">
                      {contract.titulo_contrato}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-mute">
                      {format(new Date(contract.data_termo!), "d 'de' MMMM", {
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                  <Pill tone={isUrgent ? 'danger' : 'warn'} className="shrink-0">
                    {isUrgent && <AlertTriangle className="h-3 w-3" />}
                    {daysUntilExpiry} {t('home.days')}
                  </Pill>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  },
);

export default ExpiringContractsWidget;
