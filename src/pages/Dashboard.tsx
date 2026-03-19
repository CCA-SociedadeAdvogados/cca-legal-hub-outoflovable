import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ContractsExpiringList } from '@/components/dashboard/ContractsExpiringList';
import { ContractsByStateChart } from '@/components/dashboard/ContractsByStateChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  FileCheck,
  AlertTriangle,
  Plus,
  ChevronRight,
  Calendar,
  Euro,
  Loader2,
  FileText,
  Clock,
  RefreshCw,
  Handshake,
  Ban,
  Timer,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPO_CONTRATO_LABELS } from '@/types/contracts';

const DEPT_LABELS: Record<string, string> = {
  comercial: 'Comercial',
  operacoes: 'Operações',
  it: 'IT',
  rh: 'RH',
  financeiro: 'Financeiro',
  juridico: 'Jurídico',
  marketing: 'Marketing',
  outro: 'Outro',
};

const RENOVACAO_LABELS: Record<string, string> = {
  renovacao_automatica: 'Auto',
  renovacao_mediante_acordo: 'Acordo',
  sem_renovacao_automatica: 'Sem Renov.',
};

export default function Dashboard() {
  const { stats, contratosAExpirar, expirationPipeline, contratos, isLoading } = useDashboardStats();
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
            <p className="text-muted-foreground mt-1">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/contratos">
                <FileCheck className="mr-2 h-4 w-4" />
                {t('dashboard.viewContracts')}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/contratos/novo">
                <Plus className="mr-2 h-4 w-4" />
                {t('contracts.newContract')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <StatCard
            title={t('dashboard.expiring90Days')}
            value={stats.contratosExpirar90Dias}
            icon={Clock}
            variant={stats.contratosExpirar90Dias > 0 ? "warning" : "primary"}
          />
          <StatCard
            title={t('dashboard.totalValue')}
            value={formatCurrency(stats.valorTotalContratos)}
            subtitle={t('dashboard.inContracts')}
            icon={Euro}
            variant="primary"
          />
        </div>

        {/* Alerts Banner */}
        {stats.contratosExpirar30Dias > 0 && (
          <Card className="border-risk-high/50 bg-risk-high/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-high/20">
                  <AlertTriangle className="h-5 w-5 text-risk-high" />
                </div>
                <div>
                  <p className="font-medium">
                    {t('dashboard.contractsExpiring30Days', { count: stats.contratosExpirar30Dias })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.reviewContracts')}
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/contratos">
                  {t('dashboard.viewContracts')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {stats.contratosExpirar30Dias === 0 && stats.contratosExpirar60Dias > 0 && (
          <Card className="border-risk-medium/50 bg-risk-medium/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-medium/20">
                  <Calendar className="h-5 w-5 text-risk-medium" />
                </div>
                <div>
                  <p className="font-medium">
                    {t('dashboard.contractsExpiring60Days', { count: stats.contratosExpirar60Dias })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.planRenewal')}
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/contratos">
                  {t('dashboard.viewContracts')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Row: Evolution + By Department */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 12-Month Evolution Chart */}
          {stats.contratosPorMes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('dashboard.evolution12Months')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.contratosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="criados" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} name={t('dashboard.created')} />
                    <Area type="monotone" dataKey="expirados" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.2} name={t('dashboard.terminated')} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* By Department */}
          {Object.keys(stats.contratosPorDepartamento).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('dashboard.byDepartment')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={Object.entries(stats.contratosPorDepartamento).map(([key, value]) => ({
                      name: DEPT_LABELS[key] || key,
                      value,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Row: Mini stats cards (renewal + duration) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.autoRenewal')}</p>
              <p className="text-lg font-bold">{stats.renovacaoStats.automatica}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Handshake className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.manualRenewal')}</p>
              <p className="text-lg font-bold">{stats.renovacaoStats.manual}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/30">
              <Ban className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.noRenewal')}</p>
              <p className="text-lg font-bold">{stats.renovacaoStats.semRenovacao}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Timer className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.fixedTerm')}</p>
              <p className="text-lg font-bold">{stats.duracaoStats.determinado}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <InfinityIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.openEnded')}</p>
              <p className="text-lg font-bold">{stats.duracaoStats.indeterminado}</p>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expiration Pipeline Table (180 days) */}
            {expirationPipeline.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{t('dashboard.expirationPipeline')}</CardTitle>
                  <Badge variant="secondary">{t('dashboard.next180Days')}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 font-medium">{t('contracts.contract')}</th>
                          <th className="text-left py-2 font-medium">{t('contracts.counterparty')}</th>
                          <th className="text-right py-2 font-medium">{t('contracts.value')}</th>
                          <th className="text-center py-2 font-medium">{t('dashboard.days')}</th>
                          <th className="text-center py-2 font-medium">{t('dashboard.renewal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expirationPipeline.slice(0, 10).map((item) => (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2">
                              <Link to={`/contratos/${item.id}`} className="font-medium text-accent hover:underline truncate block max-w-[200px]">
                                {item.titulo}
                              </Link>
                            </td>
                            <td className="py-2 text-muted-foreground truncate max-w-[150px]">
                              {item.contraparte || '—'}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {item.valor ? formatCurrency(item.valor) : '—'}
                            </td>
                            <td className="py-2 text-center">
                              <Badge variant={item.diasRestantes <= 30 ? 'destructive' : item.diasRestantes <= 60 ? 'default' : 'secondary'}>
                                {item.diasRestantes}d
                              </Badge>
                            </td>
                            <td className="py-2 text-center text-xs text-muted-foreground">
                              {item.renovacao ? (RENOVACAO_LABELS[item.renovacao] || item.renovacao) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <ContractsExpiringList
              contratos={contratosAExpirar}
              title={t('dashboard.contractsExpiring')}
              maxItems={5}
            />

            {/* Recent Contracts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{t('dashboard.recentContracts')}</CardTitle>
                <Button variant="ghost" size="sm" className="text-accent" asChild>
                  <Link to="/contratos">
                    {t('dashboard.viewAll')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {contratos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('dashboard.noContracts')}</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/contratos/novo">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('dashboard.createFirstContract')}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  contratos.slice(0, 5).map((contrato) => (
                    <Link
                      key={contrato.id}
                      to={`/contratos/${contrato.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contrato.titulo_contrato}</p>
                        <p className="text-xs text-muted-foreground">
                          {TIPO_CONTRATO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato} • {contrato.parte_b_nome_legal}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            <ContractsByStateChart data={stats.contratosPorEstado} />

            {/* Quick Stats - By Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('dashboard.byContractType')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.contratosPorTipo).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t('dashboard.noData')}
                  </p>
                ) : (
                  Object.entries(stats.contratosPorTipo)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([tipo, count]) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {TIPO_CONTRATO_LABELS[tipo as keyof typeof TIPO_CONTRATO_LABELS] || tipo}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* Value summary */}
            {stats.valorAnualRecorrente > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('dashboard.financialSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.totalEstimatedValue')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.valorTotalContratos)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.annualRecurringValue')}</p>
                    <p className="text-2xl font-bold text-accent">{formatCurrency(stats.valorAnualRecorrente)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
