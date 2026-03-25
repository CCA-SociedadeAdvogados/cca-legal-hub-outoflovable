import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ContractsExpiringList } from '@/components/dashboard/ContractsExpiringList';
import { ContractsByStateChart } from '@/components/dashboard/ContractsByStateChart';
import { DocumentValidityAlerts } from '@/components/dashboard/DocumentValidityAlerts';
import { ExportPDFButton } from '@/components/shared/ExportPDFButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useLegalBiStats } from '@/hooks/useLegalBiStats';
import { useDocumentChecklist } from '@/hooks/useDocumentChecklist';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useEventosLegislativos } from '@/hooks/useEventosLegislativos';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
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
  CalendarClock,
  Scale,
  Shield,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  ClipboardCheck,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPO_CONTRATO_LABELS } from '@/types/contracts';
import { cn } from '@/lib/utils';

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: '0.8rem',
};

function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

const RENOVACAO_LABELS: Record<string, string> = {
  renovacao_automatica: 'Auto',
  renovacao_mediante_acordo: 'Acordo',
  sem_renovacao_automatica: 'Sem Renov.',
};

interface TimelineEvent {
  id: string;
  date: Date;
  daysUntil: number;
  title: string;
  subtitle?: string;
  type: 'expiration' | 'renewal_deadline' | 'financial' | 'guarantee';
  contractId?: string;
  urgency: 'critical' | 'warning' | 'normal';
}

export default function Dashboard() {
  const { stats, contratosAExpirar, contratos, isLoading } = useDashboardStats();
  const biData = useLegalBiStats();
  const { items: checklistItems, isTableAvailable: checklistAvailable } = useDocumentChecklist();
  const { contratos: allContratos } = useContratos();
  const { financialItems } = useFinanceiro();
  const { eventos } = useEventosLegislativos();
  const { t, i18n } = useTranslation();

  // Build timeline events (same logic as PrazosTimeline)
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const now = new Date();
    const result: TimelineEvent[] = [];

    (allContratos ?? []).filter(c => !c.arquivado && c.estado_contrato === 'activo').forEach(c => {
      if (c.data_termo) {
        const date = new Date(c.data_termo);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > 0 && daysUntil <= 180) {
          result.push({
            id: `exp-${c.id}`, date, daysUntil,
            title: c.titulo_contrato,
            subtitle: c.parte_b_nome_legal || undefined,
            type: 'expiration', contractId: c.id,
            urgency: daysUntil <= 30 ? 'critical' : daysUntil <= 90 ? 'warning' : 'normal',
          });
        }
      }
      if (c.data_limite_decisao_renovacao) {
        const date = new Date(c.data_limite_decisao_renovacao);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > 0 && daysUntil <= 180) {
          result.push({
            id: `ren-${c.id}`, date, daysUntil,
            title: `${t('prazos.renewalDeadline', 'Limite decisão renovação')}: ${c.titulo_contrato}`,
            subtitle: c.parte_b_nome_legal || undefined,
            type: 'renewal_deadline', contractId: c.id,
            urgency: daysUntil <= 15 ? 'critical' : daysUntil <= 45 ? 'warning' : 'normal',
          });
        }
      }
      if (c.garantia_existente && c.garantia_data_validade) {
        const date = new Date(c.garantia_data_validade);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > 0 && daysUntil <= 180) {
          result.push({
            id: `gar-${c.id}`, date, daysUntil,
            title: `${t('prazos.guaranteeExpiry', 'Garantia expira')}: ${c.titulo_contrato}`,
            type: 'guarantee', contractId: c.id,
            urgency: daysUntil <= 30 ? 'critical' : daysUntil <= 60 ? 'warning' : 'normal',
          });
        }
      }
    });

    (financialItems ?? []).forEach(item => {
      if (item.data_vencimento && item.estado !== 'pago') {
        const date = new Date(item.data_vencimento);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > -30 && daysUntil <= 90) {
          result.push({
            id: `fin-${item.id}`, date, daysUntil,
            title: `${t('prazos.invoiceDue', 'Fatura')}: ${item.numero_documento || item.id}`,
            subtitle: item.valor_pendente ? `€${Number(item.valor_pendente).toLocaleString('pt-PT')}` : undefined,
            type: 'financial',
            urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 15 ? 'warning' : 'normal',
          });
        }
      }
    });

    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [allContratos, financialItems, t]);

  const recentEventos = (eventos ?? [])
    .filter(e => e.estado === 'activo')
    .sort((a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime())
    .slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language === 'pt' ? 'pt-PT' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Expirations by month for chart (BI data)
  const expirationsByMonth = useMemo(() => {
    const map: Record<string, { month: string; count: number; valor: number }> = {};
    biData.expirations.forEach(e => {
      const m = format(new Date(e.dataTermo), 'MMM yy', { locale: pt });
      if (!map[m]) map[m] = { month: m, count: 0, valor: 0 };
      map[m].count++;
      map[m].valor += e.valor || 0;
    });
    return Object.values(map);
  }, [biData.expirations]);

  // Document checklist stats
  const docStats = useMemo(() => {
    const uploaded = checklistItems.filter(i => i.entry?.status === 'uploaded').length;
    const expired = checklistItems.filter(i => i.entry?.status === 'expired').length;
    const expiringSoon = checklistItems.filter(i => i.entry?.status === 'expiring_soon').length;
    const missing = checklistItems.filter(i => !i.entry || i.entry.status === 'missing').length;
    const total = checklistItems.length;
    const percent = total > 0 ? Math.round((uploaded / total) * 100) : 0;
    const statusData = [
      { name: t('docChecklist.uploaded', 'Carregado'), value: uploaded, color: 'hsl(142, 71%, 45%)' },
      { name: t('docChecklist.expiringSoon', 'A Expirar'), value: expiringSoon, color: 'hsl(38, 92%, 50%)' },
      { name: t('docChecklist.expired', 'Expirado'), value: expired, color: 'hsl(0, 84%, 60%)' },
      { name: t('docChecklist.missing', 'Em Falta'), value: missing, color: 'hsl(220, 14%, 60%)' },
    ].filter(d => d.value > 0);
    return { uploaded, expired, expiringSoon, missing, total, percent, statusData };
  }, [checklistItems, t]);

  if (isLoading || biData.isLoading) {
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
            <ExportPDFButton contentId="dashboard-content" filename="Visao-Geral" />
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

        <div id="dashboard-content">
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <ContractsExpiringList
              contratos={contratosAExpirar}
              title={t('dashboard.contractsExpiring')}
              maxItems={5}
            />

            {/* Prazos e Datas Críticas */}
            {timelineEvents.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    {t('prazos.title', 'Prazos e Datas Críticas')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {timelineEvents.slice(0, 8).map((event) => {
                    const typeIcons: Record<string, React.ReactNode> = {
                      expiration: <CalendarClock className="h-4 w-4" />,
                      renewal_deadline: <Clock className="h-4 w-4" />,
                      financial: <Euro className="h-4 w-4" />,
                      guarantee: <AlertTriangle className="h-4 w-4" />,
                    };
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-2.5 transition-colors',
                          event.urgency === 'critical' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
                          event.urgency === 'warning' && 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                          event.urgency === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                          event.urgency === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {typeIcons[event.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          {event.contractId ? (
                            <Link to={`/contratos/${event.contractId}`} className="font-medium text-sm hover:underline truncate block">
                              {event.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm truncate block">{event.title}</span>
                          )}
                          {event.subtitle && <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{format(event.date, 'd MMM', { locale: pt })}</p>
                          <Badge
                            variant={event.urgency === 'critical' ? 'destructive' : event.urgency === 'warning' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {event.daysUntil <= 0 ? t('prazos.overdue', 'Vencido') : `${event.daysUntil}d`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recent Legislative Events */}
            {recentEventos.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{t('dashboard.recentEvents')}</CardTitle>
                  <Button variant="ghost" size="sm" className="text-accent" asChild>
                    <Link to="/eventos">
                      {t('dashboard.viewAll')}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentEventos.map(evento => (
                    <div
                      key={evento.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Scale className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {evento.area_direito || '—'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{evento.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {evento.referencia_legal}
                          {evento.data_entrada_vigor && (
                            <> · {t('common.effectiveDate')}: {format(new Date(evento.data_entrada_vigor), 'dd/MM/yyyy', { locale: pt })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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

            {/* Document Validity Alerts */}
            <DocumentValidityAlerts />

            {/* Quick Stats */}
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
                    .sort(([,a], [,b]) => b - a)
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

        {/* ─── Evolução 12 meses + RGPD ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('legalbi.evolucao', 'Evolução (12 meses)')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={biData.portfolio.contratosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="criados" name={t('legalbi.criados', 'Criados')} stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="expirados" name={t('legalbi.terminados', 'Terminados')} stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.2} />
                    <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* RGPD Mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{biData.portfolio.rgpdStats.comDadosPessoais}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('legalbi.comDadosPessoais', 'Com Dados Pessoais')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{biData.portfolio.rgpdStats.comDPA}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('legalbi.comDPA', 'Com DPA')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{biData.portfolio.rgpdStats.transferenciaInternacional}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('legalbi.transferInt', 'Transf. Internacional')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{biData.portfolio.renovacaoStats.automatica}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('legalbi.renAutomat', 'Renovação Auto.')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{biData.portfolio.duracaoStats.indeterminado}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('legalbi.prazoIndet', 'Prazo Indeterminado')}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── BI Tabs ───────────────────────────────────────────────────── */}
        <Tabs defaultValue="compliance" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="compliance" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              {t('legalbi.tabCompliance', 'Compliance')}
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1.5">
              <Euro className="h-4 w-4" />
              {t('legalbi.tabFinancial', 'Financeiro')}
            </TabsTrigger>
            <TabsTrigger value="expirations" className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {t('legalbi.tabExpirations', 'Expirações')}
            </TabsTrigger>
            {checklistAvailable && checklistItems.length > 0 && (
              <TabsTrigger value="documents" className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" />
                {t('legalbi.tabDocuments', 'Documentos')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Compliance Tab ── */}
          <TabsContent value="compliance" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.totalImpactos', 'Total Impactos')}</p><p className="text-2xl font-bold">{biData.compliance.totalImpactos}</p></div><div className={cn('p-2 rounded-lg bg-muted', biData.compliance.impactosAlto > 0 ? 'text-red-500' : 'text-primary')}><AlertTriangle className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.pendentes', 'Pendentes')}</p><p className="text-2xl font-bold">{biData.compliance.impactosPendentes}</p><p className="text-xs text-muted-foreground">Em tratamento: {biData.compliance.impactosEmTratamento}</p></div><div className={cn('p-2 rounded-lg bg-muted', biData.compliance.impactosPendentes > 0 ? 'text-amber-500' : 'text-emerald-600')}><Clock className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.eventosLeg', 'Eventos Legislativos')}</p><p className="text-2xl font-bold">{biData.compliance.totalEventos}</p><p className="text-xs text-muted-foreground">Activos: {biData.compliance.eventosActivos}</p></div><div className="p-2 rounded-lg bg-muted text-primary"><Scale className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.resolvidos', 'Resolvidos')}</p><p className="text-2xl font-bold">{biData.compliance.impactosResolvidos}</p></div><div className="p-2 rounded-lg bg-muted text-emerald-600"><ShieldCheck className="h-5 w-5" /></div></div></CardContent></Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Risk Distribution */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.porRisco', 'Impactos por Risco')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-sm">{t('legalbi.alto', 'Alto')}</span></div><span className="text-xl font-bold text-red-500">{biData.compliance.impactosAlto}</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-sm">{t('legalbi.medio', 'Médio')}</span></div><span className="text-xl font-bold text-amber-500">{biData.compliance.impactosMedio}</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm">{t('legalbi.baixo', 'Baixo')}</span></div><span className="text-xl font-bold text-emerald-500">{biData.compliance.impactosBaixo}</span></div>
                  </div>
                  {biData.compliance.totalImpactos > 0 && (
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      {biData.compliance.impactosAlto > 0 && <div className="bg-red-500 h-full" style={{ width: `${(biData.compliance.impactosAlto / biData.compliance.totalImpactos) * 100}%` }} />}
                      {biData.compliance.impactosMedio > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(biData.compliance.impactosMedio / biData.compliance.totalImpactos) * 100}%` }} />}
                      {biData.compliance.impactosBaixo > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(biData.compliance.impactosBaixo / biData.compliance.totalImpactos) * 100}%` }} />}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Treatment Status */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.porEstadoImp', 'Estado Tratamento')}</CardTitle></CardHeader>
                <CardContent>
                  {biData.compliance.impactosPorEstado.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={biData.compliance.impactosPorEstado} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                            {biData.compliance.impactosPorEstado.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={chartTooltipStyle} />
                          <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events by Area */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.eventosArea', 'Eventos por Área')}</CardTitle></CardHeader>
                <CardContent>
                  {biData.compliance.eventosPorArea.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semEventos', 'Sem eventos')}</p>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={biData.compliance.eventosPorArea} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="value" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Financial Tab ── */}
          <TabsContent value="financial" className="mt-6 space-y-6">
            {(() => {
              const { financial } = biData;
              const statusLabel = financial.statusConta === 'em_dia' ? t('legalbi.emDia', 'Em Dia') : financial.statusConta === 'em_aberto' ? t('legalbi.emAberto', 'Em Aberto') : t('legalbi.emIncumprimento', 'Em Incumprimento');
              const statusColor = financial.statusConta === 'em_dia' ? 'text-emerald-600' : financial.statusConta === 'em_aberto' ? 'text-amber-500' : 'text-red-500';
              const finChartData = [
                { name: t('legalbi.vencido', 'Vencido'), value: financial.totalVencido, color: 'hsl(0, 84%, 60%)' },
                { name: t('legalbi.aVencer', 'A Vencer'), value: financial.totalAVencer, color: 'hsl(38, 92%, 50%)' },
              ].filter(d => d.value > 0);

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.statusConta', 'Estado Conta')}</p><p className="text-2xl font-bold">{statusLabel}</p></div><div className={cn('p-2 rounded-lg bg-muted', statusColor)}>{financial.statusConta === 'em_dia' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}</div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.totalPendente', 'Total Pendente')}</p><p className="text-2xl font-bold">{formatCurrencyShort(financial.totalPendente)}</p></div><div className={cn('p-2 rounded-lg bg-muted', financial.totalPendente > 0 ? 'text-amber-500' : 'text-primary')}><Euro className="h-5 w-5" /></div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.vencido', 'Vencido')}</p><p className="text-2xl font-bold">{formatCurrencyShort(financial.totalVencido)}</p><p className="text-xs text-muted-foreground">{financial.faturasVencidas} {t('legalbi.documentos', 'documentos')}</p></div><div className={cn('p-2 rounded-lg bg-muted', financial.totalVencido > 0 ? 'text-red-500' : 'text-primary')}><AlertTriangle className="h-5 w-5" /></div></div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.aVencer', 'A Vencer')}</p><p className="text-2xl font-bold">{formatCurrencyShort(financial.totalAVencer)}</p><p className="text-xs text-muted-foreground">{financial.faturasAVencer} {t('legalbi.documentos', 'documentos')}</p></div><div className="p-2 rounded-lg bg-muted text-primary"><TrendingUp className="h-5 w-5" /></div></div></CardContent></Card>
                  </div>

                  {finChartData.length > 0 ? (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.decomposicao', 'Decomposição Financeira')}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={finChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrencyShort(value)}`}>
                                {finChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrencyShort(v)} />
                              <Legend formatter={(v) => <span className="text-sm">{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                        <p className="text-lg font-medium">{t('legalbi.contaEmDia', 'Conta em dia')}</p>
                        <p className="text-sm text-muted-foreground">{t('legalbi.semPendentes', 'Não existem valores pendentes')}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {/* ── Expirations Tab ── */}
          <TabsContent value="expirations" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.expirar30', '< 30 Dias')}</p><p className="text-2xl font-bold">{biData.portfolio.contratosExpirar30}</p></div><div className={cn('p-2 rounded-lg bg-muted', biData.portfolio.contratosExpirar30 > 0 ? 'text-red-500' : 'text-primary')}><AlertTriangle className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.expirar60', '< 60 Dias')}</p><p className="text-2xl font-bold">{biData.portfolio.contratosExpirar60}</p></div><div className={cn('p-2 rounded-lg bg-muted', biData.portfolio.contratosExpirar60 > 0 ? 'text-amber-500' : 'text-primary')}><Clock className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.pipeline', 'Pipeline (180d)')}</p><p className="text-2xl font-bold">{biData.expirations.length}</p></div><div className="p-2 rounded-lg bg-muted text-primary"><CalendarClock className="h-5 w-5" /></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.valorRisco', 'Valor em Risco')}</p><p className="text-2xl font-bold">{formatCurrencyShort(biData.expirations.reduce((s, e) => s + (e.valor || 0), 0))}</p></div><div className={cn('p-2 rounded-lg bg-muted', biData.expirations.length > 0 ? 'text-amber-500' : 'text-primary')}><Euro className="h-5 w-5" /></div></div></CardContent></Card>
            </div>

            {expirationsByMonth.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.expiracoesPorMes', 'Expirações por Mês')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expirationsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" name={t('legalbi.contratos', 'Contratos')} fill="hsl(20, 100%, 63%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('legalbi.listaExpiracoes', 'Contratos a Expirar')}</CardTitle>
                <CardDescription>{t('legalbi.proximos180', 'Próximos 180 dias')}</CardDescription>
              </CardHeader>
              <CardContent>
                {biData.expirations.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                    <p className="text-sm text-muted-foreground">{t('legalbi.nenhumaExpiracao', 'Nenhum contrato a expirar nos próximos 180 dias')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">{t('legalbi.contrato', 'Contrato')}</th>
                          <th className="pb-2 font-medium">{t('legalbi.contraparte', 'Contraparte')}</th>
                          <th className="pb-2 font-medium">{t('legalbi.tipo', 'Tipo')}</th>
                          <th className="pb-2 font-medium text-right">{t('legalbi.valor', 'Valor')}</th>
                          <th className="pb-2 font-medium text-right">{t('legalbi.expira', 'Expira')}</th>
                          <th className="pb-2 font-medium text-center">{t('legalbi.dias', 'Dias')}</th>
                          <th className="pb-2 font-medium text-center">{t('legalbi.renovacao', 'Renovação')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biData.expirations.map(e => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 max-w-[200px] truncate font-medium">{e.titulo}</td>
                            <td className="py-2 max-w-[150px] truncate text-muted-foreground">{e.contraparte || '—'}</td>
                            <td className="py-2"><Badge variant="outline" className="text-xs">{TIPO_CONTRATO_LABELS[e.tipo as keyof typeof TIPO_CONTRATO_LABELS] || e.tipo}</Badge></td>
                            <td className="py-2 text-right font-mono text-xs">{e.valor ? formatCurrencyShort(e.valor) : '—'}</td>
                            <td className="py-2 text-right text-xs">{format(new Date(e.dataTermo), 'dd/MM/yyyy')}</td>
                            <td className="py-2 text-center"><Badge variant={e.diasRestantes <= 30 ? 'destructive' : e.diasRestantes <= 60 ? 'default' : 'secondary'} className="text-xs">{e.diasRestantes}d</Badge></td>
                            <td className="py-2 text-center text-xs text-muted-foreground">{e.renovacao ? RENOVACAO_LABELS[e.renovacao] || e.renovacao : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documents Tab ── */}
          {checklistAvailable && checklistItems.length > 0 && (
            <TabsContent value="documents" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('legalbi.docTotal', 'Total Documentos')}</p><p className="text-2xl font-bold">{docStats.total}</p></div><div className="p-2 rounded-lg bg-muted text-primary"><ClipboardCheck className="h-5 w-5" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('docChecklist.uploaded', 'Carregados')}</p><p className="text-2xl font-bold">{docStats.uploaded}</p><p className="text-xs text-muted-foreground">{docStats.percent}%</p></div><div className="p-2 rounded-lg bg-muted text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('docChecklist.expired', 'Expirados')}</p><p className="text-2xl font-bold">{docStats.expired + docStats.expiringSoon}</p></div><div className={cn('p-2 rounded-lg bg-muted', docStats.expired > 0 ? 'text-red-500' : docStats.expiringSoon > 0 ? 'text-amber-500' : 'text-primary')}><AlertTriangle className="h-5 w-5" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{t('docChecklist.missing', 'Em Falta')}</p><p className="text-2xl font-bold">{docStats.missing}</p></div><div className={cn('p-2 rounded-lg bg-muted', docStats.missing > 0 ? 'text-amber-500' : 'text-primary')}><XCircle className="h-5 w-5" /></div></div></CardContent></Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{t('legalbi.docByStatus', 'Documentos por Estado')}</CardTitle></CardHeader>
                  <CardContent>
                    {docStats.statusData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={docStats.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                              {docStats.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipStyle} />
                            <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('legalbi.docProgress', 'Progresso de Conformidade')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{docStats.uploaded} / {docStats.total}</span>
                        <span className="font-bold">{docStats.percent}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${docStats.percent === 100 ? 'bg-emerald-500' : docStats.percent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${docStats.percent}%` }} />
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      {checklistItems.map(item => {
                        const status = item.entry?.status || 'missing';
                        const StatusIcon = status === 'uploaded' ? CheckCircle2 : status === 'expired' ? XCircle : status === 'expiring_soon' ? AlertTriangle : XCircle;
                        const statusColor = status === 'uploaded' ? 'text-emerald-500' : status === 'expired' ? 'text-red-500' : status === 'expiring_soon' ? 'text-amber-500' : 'text-muted-foreground';
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusIcon className={`h-4 w-4 shrink-0 ${statusColor}`} />
                              <span className="text-sm truncate">{i18n.language === 'en' && item.name_en ? item.name_en : item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.entry?.validity_date && (
                                <span className="text-xs text-muted-foreground">{format(new Date(item.entry.validity_date), 'dd/MM/yyyy')}</span>
                              )}
                              <Badge variant={status === 'uploaded' ? 'default' : status === 'expired' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {t(`docChecklist.${status === 'expiring_soon' ? 'expiringSoon' : status}`, status)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
        </div>{/* end dashboard-content */}
      </div>
    </AppLayout>
  );
}
