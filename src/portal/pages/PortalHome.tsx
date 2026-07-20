import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Wallet,
  RefreshCw,
  FileX,
  BellRing,
} from 'lucide-react';
import { Eyebrow, KPI } from '@/components/cca';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useProfile } from '@/hooks/useProfile';
import { ContratoStatusBadge } from '@/portal/components/ContratoStatusBadge';
import {
  formatCurrency,
  formatDate,
  getContratoDeadlines,
  type DeadlineKind,
} from '@/portal/lib/contrato';

const KIND_ICON: Record<DeadlineKind, React.ElementType> = {
  renewal: RefreshCw,
  term: FileX,
  notice: BellRing,
};

function SectionCard({
  title,
  to,
  linkLabel,
  children,
}: {
  title: string;
  to: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-card border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
          {title}
        </h2>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand transition-colors hover:text-brand/80"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

export default function PortalHome() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { profile } = useProfile();
  const { contratos, isLoading: isLoadingContratos } = useContratos();
  const { accountSummary, isLoading: isLoadingFin } = useFinanceiro();

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

  const activeCount = useMemo(
    () => (contratos ?? []).filter((c) => c.estado_contrato === 'activo').length,
    [contratos],
  );

  // Mesma fonte da aba Prazos (getContratoDeadlines): inclui vencidos e futuros.
  // Mostra os mais urgentes primeiro (datas mais antigas → vencidos no topo).
  const upcomingDeadlines = useMemo(() => {
    const items = (contratos ?? []).flatMap((c) =>
      getContratoDeadlines(c).map((d) => ({ contratoId: c.id, titulo: c.titulo_contrato, ...d })),
    );
    return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [contratos]);

  // KPI: prazos a precisar de atenção = vencidos + a vencer nos próximos 30 dias.
  const upcoming30 = useMemo(
    () =>
      (contratos ?? []).reduce(
        (acc, c) => acc + getContratoDeadlines(c).filter((d) => d.days <= 30).length,
        0,
      ),
    [contratos],
  );

  const recentContratos = useMemo(
    () =>
      [...(contratos ?? [])]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [contratos],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.home.eyebrow')}</Eyebrow>
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-[-0.02em] text-ink">
          {firstName
            ? t('portal.home.greeting', { name: firstName })
            : t('portal.home.greetingNoName')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.home.description')}
        </p>
      </header>

      {/* KPIs */}
      {isLoadingContratos || isLoadingFin ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KPI label={t('portal.home.kpi.activeContracts')} value={activeCount} />
          <KPI
            label={t('portal.home.kpi.upcomingDeadlines')}
            value={upcoming30}
            trend={upcoming30 > 0 ? 'warn' : 'flat'}
          />
          <KPI
            label={t('portal.financial.kpi.outstanding')}
            value={formatCurrency(accountSummary.totalEmAberto, lang)}
            trend={accountSummary.status === 'em_incumprimento' ? 'down' : 'flat'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Próximos prazos */}
        <SectionCard
          title={t('portal.home.sections.deadlines')}
          to="/portal/prazos"
          linkLabel={t('portal.home.viewAll')}
        >
          {isLoadingContratos ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-control" />
              ))}
            </div>
          ) : upcomingDeadlines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-ink-mute">
              <CalendarClock className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-[12.5px]">{t('portal.deadlines.empty')}</span>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {upcomingDeadlines.map((d, idx) => {
                const Icon = KIND_ICON[d.kind];
                const tone =
                  d.days < 0 ? 'text-danger' : d.days <= 30 ? 'text-warn' : 'text-ink-soft';
                const daysLabel =
                  d.days < 0
                    ? t('portal.deadlines.overdueDays', { count: Math.abs(d.days) })
                    : d.days === 0
                      ? t('portal.deadlines.today')
                      : t('portal.deadlines.inDays', { count: d.days });
                return (
                  <li key={`${d.contratoId}-${d.kind}-${idx}`} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-ink-mute" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{d.titulo}</span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[11.5px] text-ink-soft">
                        {formatDate(d.date.toISOString(), lang)}
                      </span>
                      <span className={cn('block text-[11px] font-medium', tone)}>{daysLabel}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Contratos recentes */}
        <SectionCard
          title={t('portal.home.sections.recentContracts')}
          to="/portal/contratos"
          linkLabel={t('portal.home.viewAll')}
        >
          {isLoadingContratos ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-control" />
              ))}
            </div>
          ) : recentContratos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-ink-mute">
              <FileText className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-[12.5px]">{t('portal.contracts.empty')}</span>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentContratos.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {c.titulo_contrato}
                  </span>
                  <ContratoStatusBadge estado={c.estado_contrato} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Atalho financeiro */}
      <Link
        to="/portal/financeiro"
        className="group flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 transition-colors hover:border-brand/30 hover:bg-bg-alt"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-brand/20 bg-brand/[0.06] text-brand">
          <Wallet className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-ink">{t('portal.nav.financial')}</p>
          <p className="text-[12.5px] text-ink-mute">
            {t(`portal.financial.status.${accountSummary.status}`)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
      </Link>
    </div>
  );
}
