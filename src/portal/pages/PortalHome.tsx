import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
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
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAssuntos, type AssuntoEstado } from '@/hooks/useAssuntos';
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
  const { currentOrganization } = useOrganizations();
  const { contratos, isLoading: isLoadingContratos } = useContratos();
  const { accountSummary, isLoading: isLoadingFin } = useFinanceiro();
  const { assuntos, isLoading: isLoadingAssuntos } = useAssuntos(currentOrganization?.id);

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

  const ATIVO_ESTADOS: AssuntoEstado[] = ['aberto', 'em_curso', 'aguarda_cliente'];
  const activeMatters = useMemo(
    () => assuntos.filter((a) => ATIVO_ESTADOS.includes(a.estado as AssuntoEstado)).length,
    [assuntos],
  );

  const recentAssuntos = useMemo(
    () =>
      [...assuntos]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [assuntos],
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

      {/* Painel-herói — atenção da semana (índigo), coerente com o cockpit */}
      {!isLoadingContratos && (
        <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-sidebar to-[hsl(224_30%_18%)] p-6 text-sidebar-ink lg:p-7">
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 text-white opacity-[0.06]"
          >
            {[88, 66, 44, 22].map((r) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="relative z-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-sidebar-ink-mute">
              {t('portal.home.sections.deadlines')}
            </div>
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="font-display text-[52px] font-bold leading-none tracking-[-0.04em] text-white [font-variant-numeric:tabular-nums]">
                {upcoming30}
              </span>
              <span className="font-display text-base font-semibold text-sidebar-ink-mute">
                {upcoming30 === 1
                  ? t('portal.deadlines.needAttentionOne', 'a precisar de atenção')
                  : t('portal.deadlines.needAttention', 'a precisar de atenção')}
              </span>
            </div>
            {upcomingDeadlines.length > 0 && (
              <div className="mt-4 max-w-2xl">
                {upcomingDeadlines.slice(0, 4).map((d, idx) => {
                  const tone =
                    d.days < 0
                      ? 'bg-danger/25 text-white'
                      : d.days <= 30
                        ? 'bg-warn/25 text-white'
                        : 'bg-white/10 text-sidebar-ink';
                  const daysLabel =
                    d.days < 0
                      ? t('portal.deadlines.overdueDays', { count: Math.abs(d.days) })
                      : d.days === 0
                        ? t('portal.deadlines.today')
                        : t('portal.deadlines.inDays', { count: d.days });
                  return (
                    <Link
                      key={`${d.contratoId}-${d.kind}-${idx}`}
                      to="/portal/prazos"
                      className="grid grid-cols-[76px_1fr_auto] items-center gap-3 border-t border-white/10 py-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="font-mono text-[12px] text-sidebar-ink-mute [font-variant-numeric:tabular-nums]">
                        {formatDate(d.date.toISOString(), lang)}
                      </span>
                      <span className="min-w-0 truncate text-[13.5px] font-medium text-white">
                        {d.titulo}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold',
                          tone,
                        )}
                      >
                        {daysLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* KPIs */}
      {isLoadingContratos || isLoadingFin ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KPI
            label={t('portal.home.kpi.activeMatters', 'Assuntos ativos')}
            value={activeMatters}
          />
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

        {/* Assuntos recentes */}
        <SectionCard
          title={t('portal.home.sections.recentMatters', 'Assuntos recentes')}
          to="/portal/assuntos"
          linkLabel={t('portal.home.viewAll')}
        >
          {isLoadingAssuntos ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-control" />
              ))}
            </div>
          ) : recentAssuntos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-ink-mute">
              <Briefcase className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-[12.5px]">{t('portal.matters.empty')}</span>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentAssuntos.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{a.titulo}</span>
                  <span className="shrink-0 rounded-full border border-line bg-bg-alt px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
                    {t(`portal.matters.estados.${(a.estado as AssuntoEstado) ?? 'aberto'}`)}
                  </span>
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
