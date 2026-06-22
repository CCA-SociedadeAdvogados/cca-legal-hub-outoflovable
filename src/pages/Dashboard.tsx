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
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileCheck,
  AlertTriangle,
  Plus,
  ChevronRight,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPO_CONTRATO_LABELS, ESTADO_CONTRATO_LABELS } from '@/types/contracts';
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
  const { t } = useTranslation();

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

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
          <div>
            <h1 className="text-2xl font-bold">
              {firstName ? t('dashboard.welcome', { name: firstName }) : t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t('dashboard.subtitle')}</p>
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

        <div id="dashboard-content" className="space-y-4">
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
                  'overflow-hidden relative',
                  docStats.percent < 50 && 'border-danger/30',
                )}
              >
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

          {/* Mid Grid: Contratos Recentes (fluid) + Validade Documental (fixed 320px) */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px]">
            {/* Contratos Recentes */}
            <Card>
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
                  {contratosAExpirar.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      to={`/contratos/${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{c.titulo_contrato}</p>
                      {c.data_termo && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(c.data_termo), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </Link>
                  ))}
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
