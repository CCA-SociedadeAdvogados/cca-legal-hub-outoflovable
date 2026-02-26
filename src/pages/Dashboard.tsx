import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ContractsExpiringList } from '@/components/dashboard/ContractsExpiringList';
import { ContractsByStateChart } from '@/components/dashboard/ContractsByStateChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ChevronRight,
  Loader2,
  FileCheck,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPO_CONTRATO_LABELS } from '@/types/contracts';

export default function Dashboard() {
  const { stats, contratosAExpirar, contratos, isLoading } = useDashboardStats();
  const { t, i18n } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language === 'pt' ? 'pt-PT' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/contratos">
                <FileCheck className="mr-2 h-4 w-4" />
                {t('dashboard.viewContracts')}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/contratos/novo">
                <Plus className="mr-2 h-4 w-4" />
                {t('contracts.newContract')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('dashboard.totalContracts')}
            value={stats.totalContratos}
            icon="📄"
            variant="primary"
          />
          <StatCard
            title={t('dashboard.activeContracts')}
            value={stats.contratosActivos}
            icon="✅"
            variant="accent"
          />
          <StatCard
            title={t('dashboard.expiring90Days')}
            value={stats.contratosExpirar90Dias}
            icon="⏰"
            variant={stats.contratosExpirar90Dias > 0 ? 'warning' : 'primary'}
          />
          <StatCard
            title={t('dashboard.totalValue')}
            value={formatCurrency(stats.valorTotalContratos)}
            subtitle={t('dashboard.inContracts')}
            icon="💶"
            variant="primary"
          />
        </div>

        {/* Alert Banners */}
        {stats.contratosExpirar30Dias > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-l-risk-high border border-risk-high/20 bg-risk-high/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-risk-high/15 text-xl">
              🚨
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">
                  {t('dashboard.contractsExpiring30Days', { count: stats.contratosExpirar30Dias })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.reviewContracts')}</p>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link to="/contratos">
                  {t('dashboard.viewContracts')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {stats.contratosExpirar30Dias === 0 && stats.contratosExpirar60Dias > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl border-l-4 border-l-risk-medium border border-risk-medium/20 bg-risk-medium/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-risk-medium/15 text-xl">
              ⏰
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">
                  {t('dashboard.contractsExpiring60Days', { count: stats.contratosExpirar60Dias })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.planRenewal')}</p>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link to="/contratos">
                  {t('dashboard.viewContracts')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Grid — 3/5 left + 2/5 right */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Expiring Contracts (wider) */}
          <div className="lg:col-span-3">
            <ContractsExpiringList
              contratos={contratosAExpirar}
              title={t('dashboard.contractsExpiring')}
              maxItems={6}
            />
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <ContractsByStateChart data={stats.contratosPorEstado} />

            {/* By contract type with progress bars */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('dashboard.byContractType')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.contratosPorTipo).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">{t('dashboard.noData')}</p>
                ) : (
                  Object.entries(stats.contratosPorTipo)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([tipo, count]) => {
                      const total = stats.totalContratos || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={tipo}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground truncate">
                              {TIPO_CONTRATO_LABELS[tipo as keyof typeof TIPO_CONTRATO_LABELS] || tipo}
                            </span>
                            <span className="text-xs font-semibold ml-2 shrink-0">{count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>

            {/* Financial summary */}
            {stats.valorAnualRecorrente > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('dashboard.financialSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.totalEstimatedValue')}</p>
                    <p className="text-xl font-bold font-serif">{formatCurrency(stats.valorTotalContratos)}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">{t('dashboard.annualRecurringValue')}</p>
                    <p className="text-xl font-bold font-serif text-accent">
                      {formatCurrency(stats.valorAnualRecorrente)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Contracts — full-width list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t('dashboard.recentContracts')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent h-7 text-xs" asChild>
              <Link to="/contratos">
                {t('dashboard.viewAll')}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {contratos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t('dashboard.noContracts')}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/contratos/novo">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('dashboard.createFirstContract')}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {contratos.slice(0, 5).map((contrato) => (
                  <Link
                    key={contrato.id}
                    to={`/contratos/${contrato.id}`}
                    className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contrato.titulo_contrato}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {TIPO_CONTRATO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato}
                        {contrato.parte_b_nome_legal ? ` · ${contrato.parte_b_nome_legal}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
