import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DocumentValidityAlerts } from '@/components/dashboard/DocumentValidityAlerts';
import { ExportPDFButton } from '@/components/shared/ExportPDFButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDocumentChecklist } from '@/hooks/useDocumentChecklist';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Eyebrow } from '@/components/cca';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileCheck,
  AlertTriangle,
  Plus,
  ChevronRight,
  Loader2,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPO_CONTRATO_LABELS, ESTADO_CONTRATO_LABELS } from '@/types/contracts';
import { getContractPhase } from '@/lib/contractEstado';
import { cn } from '@/lib/utils';

const ESTADO_ICON_BG: Record<string, string> = {
  rascunho: 'bg-gray-100 dark:bg-gray-800',
  em_revisao: 'bg-warn/10',
  em_aprovacao: 'bg-brand/10',
  enviado_para_assinatura: 'bg-brand/10',
  activo: 'bg-positive/10',
  expirado: 'bg-danger/10',
  denunciado: 'bg-danger/10',
  rescindido: 'bg-gray-100 dark:bg-gray-800',
};

const ESTADO_ICON_COLOR: Record<string, string> = {
  rascunho: 'text-gray-500',
  em_revisao: 'text-warn',
  em_aprovacao: 'text-brand',
  enviado_para_assinatura: 'text-brand',
  activo: 'text-positive',
  expirado: 'text-danger',
  denunciado: 'text-danger',
  rescindido: 'text-gray-400',
};

const ESTADO_BADGE_CLASS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  em_revisao: 'bg-warn/10 text-warn',
  em_aprovacao: 'bg-brand/10 text-brand',
  enviado_para_assinatura: 'bg-brand/10 text-brand',
  activo: 'bg-positive/10 text-positive',
  expirado: 'bg-danger/10 text-danger',
  denunciado: 'bg-danger/10 text-danger',
  rescindido: 'bg-gray-100 text-gray-500 dark:bg-gray-800',
};

export default function Dashboard() {
  const { stats, contratosAExpirar, contratos, isLoading } = useDashboardStats();
  const { items: checklistItems, isTableAvailable: checklistAvailable } = useDocumentChecklist();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

  // Saudação consciente da hora + data por extenso (locale-aware).
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 13) return t('home.greetingMorning');
    if (h < 20) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };
  const dateLong = () => {
    const s = new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const sessionStarted = user?.last_sign_in_at
    ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: pt })
    : null;

  // Distribuição da carteira por fase (em preparação · em vigor · terminado).
  const phases = useMemo(() => {
    const active = (contratos ?? []).filter((c) => !c.arquivado);
    let preparacao = 0;
    let vigor = 0;
    let terminado = 0;
    for (const c of active) {
      const phase = getContractPhase(c.estado_contrato);
      if (phase === 'vigor') vigor++;
      else if (phase === 'terminado') terminado++;
      else preparacao++;
    }
    return { preparacao, vigor, terminado, total: active.length };
  }, [contratos]);

  const docStats = useMemo(() => {
    const uploaded = checklistItems.filter((i) => i.entry?.status === 'uploaded').length;
    const expired = checklistItems.filter((i) => i.entry?.status === 'expired').length;
    const missing = checklistItems.filter((i) => !i.entry || i.entry.status === 'missing').length;
    const total = checklistItems.length;
    const percent = total > 0 ? Math.round((uploaded / total) * 100) : 0;
    return { uploaded, expired, missing, total, percent };
  }, [checklistItems]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <Eyebrow>{dateLong()}</Eyebrow>
            <h1 className="font-display text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink">
              {firstName ? (
                <>
                  {greeting()}, <span className="italic text-brand">{firstName}</span>.
                </>
              ) : (
                greeting()
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
            {sessionStarted && (
              <div className="inline-flex items-center gap-2 pt-1 text-[12px] text-ink-soft">
                <span className="h-[7px] w-[7px] rounded-full bg-positive" />
                {t('home.summary.sessionStarted')}{' '}
                <span className="font-medium text-ink">{sessionStarted}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <ExportPDFButton contentId="dashboard-content" filename="Visao-Geral" />
            <Button variant="outline" size="sm" asChild>
              <Link to="/contratos">
                <FileCheck className="mr-2 h-3.5 w-3.5" />
                {t('dashboard.viewContracts')}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/contratos/novo">
                <Plus className="mr-2 h-3.5 w-3.5" />
                {t('contracts.newContract')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Resumo do dia — banner hero */}
        <section className="relative overflow-hidden rounded-card border border-line bg-gradient-to-r from-secondary to-card p-6 shadow-card lg:p-7">
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -right-8 top-1/2 h-56 w-56 -translate-y-1/2 text-ink opacity-[0.07]"
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
          <div className="relative z-10 max-w-2xl">
            <div className="eyebrow mb-2.5" style={{ color: 'hsl(var(--accent-brand))' }}>
              ✦ {t('home.summary.eyebrow')}
            </div>
            {stats.contratosExpirar90Dias > 0 ? (
              <>
                <h2 className="font-serif text-[24px] font-normal leading-tight tracking-tight text-ink">
                  <span style={{ color: 'hsl(var(--accent-brand))' }}>
                    {stats.contratosExpirar90Dias}
                  </span>{' '}
                  {t('home.summary.expiring', { count: stats.contratosExpirar90Dias })}
                </h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">{t('home.summary.window')}</p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-[24px] font-normal leading-tight tracking-tight text-ink">
                  {t('home.summary.allClear')}
                </h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">{t('home.summary.allClearSub')}</p>
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button asChild size="sm">
                <Link to="/contratos">{t('home.summary.reviewContracts')}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/prazos">
                  <Clock className="mr-2 h-4 w-4" />
                  {t('home.summary.viewDeadlines')}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div id="dashboard-content" className="dash-enter space-y-4">
          {/* KPI Row */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('dashboard.totalContracts')}
              value={stats.totalContratos}
              icon={FileText}
              variant="primary"
            />
            <StatCard
              title={t('dashboard.activeContracts')}
              value={stats.contratosActivos}
              icon={FileCheck}
              variant="accent"
            />
            {/* Compliance Documental KPI — só quando há checklist com dados */}
            {checklistAvailable && docStats.total > 0 && (
              <Card
                className={cn(
                  'group relative overflow-hidden transition-transform duration-200 hover:-translate-y-[3px]',
                  docStats.percent < 50 && 'border-danger/30',
                )}
              >
                <span className="pointer-events-none absolute left-0 top-0 z-10 h-0.5 w-7 bg-brand transition-all duration-300 group-hover:w-full" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t('dashboard.docCompliance', 'Compliance Documental')}
                      </p>
                      <p
                        className={cn(
                          'text-3xl font-bold font-serif tracking-tight',
                          docStats.percent < 50 && 'text-danger',
                        )}
                      >
                        {docStats.percent}%
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          docStats.percent < 50 ? 'text-danger' : 'text-muted-foreground',
                        )}
                      >
                        {docStats.expired + docStats.missing}{' '}
                        {t('dashboard.docsIssue', 'em falta ou expirados')}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        docStats.percent < 50
                          ? 'bg-danger/10 text-danger'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className={cn(
                      'h-full transition-all',
                      docStats.percent >= 100
                        ? 'bg-positive'
                        : docStats.percent >= 50
                          ? 'bg-primary'
                          : 'bg-danger',
                    )}
                    style={{ width: `${docStats.percent}%` }}
                  />
                </div>
              </Card>
            )}
            <StatCard
              title={t('dashboard.expiring90Days')}
              value={stats.contratosExpirar90Dias}
              icon={Clock}
              variant={stats.contratosExpirar90Dias > 0 ? 'warning' : 'primary'}
            />
          </div>

          {/* Carteira por fase — leitura macro do ciclo de vida (CLM) */}
          {phases.total > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('dashboard.portfolioByPhase', 'Carteira por fase')}
                  </p>
                  <Link
                    to="/contratos"
                    className="text-accent text-xs inline-flex items-center hover:underline"
                  >
                    {t('dashboard.viewAll')} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {phases.preparacao > 0 && (
                    <div
                      className="h-full bg-warn"
                      style={{ width: `${(phases.preparacao / phases.total) * 100}%` }}
                      title={t('portal.lifecycle.phases.preparacao', 'Em preparação')}
                    />
                  )}
                  {phases.vigor > 0 && (
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${(phases.vigor / phases.total) * 100}%` }}
                      title={t('portal.lifecycle.phases.vigor', 'Em vigor')}
                    />
                  )}
                  {phases.terminado > 0 && (
                    <div
                      className="h-full bg-ink-mute/40"
                      style={{ width: `${(phases.terminado / phases.total) * 100}%` }}
                      title={t('portal.lifecycle.phases.terminado', 'Terminados')}
                    />
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-warn" />
                    {t('portal.lifecycle.phases.preparacao', 'Em preparação')}
                    <span className="font-mono">{phases.preparacao}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    {t('portal.lifecycle.phases.vigor', 'Em vigor')}
                    <span className="font-mono">{phases.vigor}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-ink-mute/50" />
                    {t('portal.lifecycle.phases.terminado', 'Terminados')}
                    <span className="font-mono">{phases.terminado}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mid Grid: Contratos Recentes (fluid) + Validade Documental (fixed 320px) */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Contratos Recentes */}
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm font-semibold">
                  {t('dashboard.recentContracts')}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-accent h-7 text-xs px-2" asChild>
                  <Link to="/contratos">
                    {t('dashboard.viewAll')} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {contratos.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground px-6">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{t('dashboard.noContracts')}</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/contratos/novo">
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        {t('dashboard.createFirstContract')}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {contratos.slice(0, 5).map((contrato) => (
                      <Link
                        key={contrato.id}
                        to={`/contratos/${contrato.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            ESTADO_ICON_BG[contrato.estado_contrato] || 'bg-muted',
                          )}
                        >
                          <FileText
                            className={cn(
                              'h-4 w-4',
                              ESTADO_ICON_COLOR[contrato.estado_contrato] ||
                                'text-muted-foreground',
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {contrato.titulo_contrato}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {TIPO_CONTRATO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato}
                            {contrato.parte_b_nome_legal && <> · {contrato.parte_b_nome_legal}</>}
                            {!contrato.data_termo ? (
                              <> · {t('contracts.openEnded', 'Prazo indeterminado')}</>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight',
                              ESTADO_BADGE_CLASS[contrato.estado_contrato] ||
                                'bg-muted text-muted-foreground',
                            )}
                          >
                            {ESTADO_CONTRATO_LABELS[
                              contrato.estado_contrato as keyof typeof ESTADO_CONTRATO_LABELS
                            ] || contrato.estado_contrato}
                          </span>
                          {contrato.created_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(contrato.created_at), 'd MMM yyyy', { locale: pt })}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validade Documental */}
            <DocumentValidityAlerts />
          </div>

          {/* A Expirar — só quando há contratos a expirar (próximos 90 dias) */}
          {contratosAExpirar.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warn" />
                  {t('dashboard.contractsExpiring', 'A Expirar')}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-accent h-7 text-xs px-2" asChild>
                  <Link to="/contratos">
                    {t('dashboard.viewAll')} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {contratosAExpirar.slice(0, 5).map((c) => {
                    const days = c.data_termo
                      ? differenceInDays(new Date(c.data_termo), new Date())
                      : null;
                    const urgent = days !== null && days <= 30;
                    return (
                      <Link
                        key={c.id}
                        to={`/contratos/${c.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <p className="text-sm font-medium truncate">{c.titulo_contrato}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {days !== null && (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight',
                                urgent ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn',
                              )}
                            >
                              {t('dashboard.inDays', {
                                count: days,
                                defaultValue: `em ${days} dias`,
                              })}
                            </span>
                          )}
                          {c.data_termo && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(c.data_termo), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* end dashboard-content */}
      </div>
    </AppLayout>
  );
}
