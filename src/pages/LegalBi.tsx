import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import { AppLayout } from '@/components/layout/AppLayout';
import { useLegalBiStats } from '@/hooks/useLegalBiStats';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { useDocumentChecklist } from '@/hooks/useDocumentChecklist';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import {
  BarChart3, Loader2, FileText, TrendingUp, Shield, Euro,
  AlertTriangle, Clock, CalendarClock, CheckCircle2,
  Scale, ShieldCheck, ArrowUpRight, ArrowDownRight, ExternalLink,
  ClipboardCheck, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExportPDFButton } from '@/components/shared/ExportPDFButton';

const ESTADO_COLORS: Record<string, string> = {
  rascunho: 'hsl(220, 14%, 60%)',
  em_revisao: 'hsl(38, 92%, 50%)',
  em_aprovacao: 'hsl(262, 83%, 58%)',
  enviado_para_assinatura: 'hsl(200, 98%, 39%)',
  activo: 'hsl(142, 71%, 45%)',
  expirado: 'hsl(0, 84%, 60%)',
  denunciado: 'hsl(0, 84%, 40%)',
  rescindido: 'hsl(0, 0%, 45%)',
};

const TIPO_COLORS = [
  'hsl(20, 100%, 63%)', // coral CCA
  'hsl(200, 98%, 39%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 60%, 45%)',
  'hsl(330, 80%, 55%)',
  'hsl(60, 70%, 45%)',
  'hsl(220, 14%, 60%)',
];

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: '0.8rem',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trend.value >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted', variantClasses[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Portfolio Tab ──────────────────────────────────────────────────────────

function PortfolioTab({ data }: { data: ReturnType<typeof useLegalBiStats> }) {
  const { portfolio } = data;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t('legalbi.totalContratos', 'Total Contratos')}
          value={portfolio.totalContratos}
          icon={FileText}
        />
        <KpiCard
          title={t('legalbi.activos', 'Activos')}
          value={portfolio.contratosActivos}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title={t('legalbi.valorCarteira', 'Valor Carteira')}
          value={formatCurrency(portfolio.valorTotalCarteira)}
          subtitle={`ARR: ${formatCurrency(portfolio.valorAnualRecorrente)}`}
          icon={Euro}
        />
        <KpiCard
          title={t('legalbi.expirar90', 'A Expirar (90d)')}
          value={portfolio.contratosExpirar90}
          subtitle={`30d: ${portfolio.contratosExpirar30} | 60d: ${portfolio.contratosExpirar60}`}
          icon={CalendarClock}
          variant={portfolio.contratosExpirar30 > 0 ? 'danger' : portfolio.contratosExpirar90 > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Estado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.porEstado', 'Contratos por Estado')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.contratosPorEstado.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolio.contratosPorEstado} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                      {portfolio.contratosPorEstado.map((entry, i) => (
                        <Cell key={i} fill={ESTADO_COLORS[entry.key] || TIPO_COLORS[i % TIPO_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.porTipo', 'Contratos por Tipo')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.contratosPorTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portfolio.contratosPorTipo} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill="hsl(20, 100%, 63%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.evolucao', 'Evolução (12 meses)')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolio.contratosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="criados" name={t('legalbi.criados', 'Criados')} stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="expirados" name={t('legalbi.terminados', 'Terminados')} stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.2} />
                  <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Departamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.porDepartamento', 'Por Departamento')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.contratosPorDepartamento.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portfolio.contratosPorDepartamento}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RGPD + Renovação mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{portfolio.rgpdStats.comDadosPessoais}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('legalbi.comDadosPessoais', 'Com Dados Pessoais')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{portfolio.rgpdStats.comDPA}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('legalbi.comDPA', 'Com DPA')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{portfolio.rgpdStats.transferenciaInternacional}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('legalbi.transferInt', 'Transf. Internacional')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{portfolio.renovacaoStats.automatica}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('legalbi.renAutomat', 'Renovação Auto.')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{portfolio.duracaoStats.indeterminado}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('legalbi.prazoIndet', 'Prazo Indeterminado')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Compliance Tab ─────────────────────────────────────────────────────────

function ComplianceTab({ data }: { data: ReturnType<typeof useLegalBiStats> }) {
  const { compliance } = data;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t('legalbi.totalImpactos', 'Total Impactos')}
          value={compliance.totalImpactos}
          icon={AlertTriangle}
          variant={compliance.impactosAlto > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title={t('legalbi.pendentes', 'Pendentes')}
          value={compliance.impactosPendentes}
          subtitle={`Em tratamento: ${compliance.impactosEmTratamento}`}
          icon={Clock}
          variant={compliance.impactosPendentes > 0 ? 'warning' : 'success'}
        />
        <KpiCard
          title={t('legalbi.eventosLeg', 'Eventos Legislativos')}
          value={compliance.totalEventos}
          subtitle={`Activos: ${compliance.eventosActivos}`}
          icon={Scale}
        />
        <KpiCard
          title={t('legalbi.resolvidos', 'Resolvidos')}
          value={compliance.impactosResolvidos}
          icon={ShieldCheck}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.porRisco', 'Impactos por Risco')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">{t('legalbi.alto', 'Alto')}</span>
                </div>
                <span className="text-xl font-bold text-red-500">{compliance.impactosAlto}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">{t('legalbi.medio', 'Médio')}</span>
                </div>
                <span className="text-xl font-bold text-amber-500">{compliance.impactosMedio}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">{t('legalbi.baixo', 'Baixo')}</span>
                </div>
                <span className="text-xl font-bold text-emerald-500">{compliance.impactosBaixo}</span>
              </div>
            </div>
            {compliance.totalImpactos > 0 && (
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                {compliance.impactosAlto > 0 && (
                  <div className="bg-red-500 h-full" style={{ width: `${(compliance.impactosAlto / compliance.totalImpactos) * 100}%` }} />
                )}
                {compliance.impactosMedio > 0 && (
                  <div className="bg-amber-500 h-full" style={{ width: `${(compliance.impactosMedio / compliance.totalImpactos) * 100}%` }} />
                )}
                {compliance.impactosBaixo > 0 && (
                  <div className="bg-emerald-500 h-full" style={{ width: `${(compliance.impactosBaixo / compliance.totalImpactos) * 100}%` }} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impactos por estado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.porEstadoImp', 'Estado Tratamento')}</CardTitle>
          </CardHeader>
          <CardContent>
            {compliance.impactosPorEstado.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados', 'Sem dados')}</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={compliance.impactosPorEstado} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {compliance.impactosPorEstado.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por área */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.eventosArea', 'Eventos por Área')}</CardTitle>
          </CardHeader>
          <CardContent>
            {compliance.eventosPorArea.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semEventos', 'Sem eventos')}</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compliance.eventosPorArea} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Financial Tab ──────────────────────────────────────────────────────────

function FinancialTab({ data }: { data: ReturnType<typeof useLegalBiStats> }) {
  const { financial } = data;
  const { t } = useTranslation();

  const statusLabel = financial.statusConta === 'em_dia'
    ? t('legalbi.emDia', 'Em Dia')
    : financial.statusConta === 'em_aberto'
      ? t('legalbi.emAberto', 'Em Aberto')
      : t('legalbi.emIncumprimento', 'Em Incumprimento');

  const statusVariant = financial.statusConta === 'em_dia'
    ? 'success' as const
    : financial.statusConta === 'em_aberto'
      ? 'warning' as const
      : 'danger' as const;

  const chartData = [
    { name: t('legalbi.vencido', 'Vencido'), value: financial.totalVencido, color: 'hsl(0, 84%, 60%)' },
    { name: t('legalbi.aVencer', 'A Vencer'), value: financial.totalAVencer, color: 'hsl(38, 92%, 50%)' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t('legalbi.statusConta', 'Estado Conta')}
          value={statusLabel}
          icon={financial.statusConta === 'em_dia' ? CheckCircle2 : AlertTriangle}
          variant={statusVariant}
        />
        <KpiCard
          title={t('legalbi.totalPendente', 'Total Pendente')}
          value={formatCurrency(financial.totalPendente)}
          icon={Euro}
          variant={financial.totalPendente > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title={t('legalbi.vencido', 'Vencido')}
          value={formatCurrency(financial.totalVencido)}
          subtitle={`${financial.faturasVencidas} ${t('legalbi.documentos', 'documentos')}`}
          icon={AlertTriangle}
          variant={financial.totalVencido > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title={t('legalbi.aVencer', 'A Vencer')}
          value={formatCurrency(financial.totalAVencer)}
          subtitle={`${financial.faturasAVencer} ${t('legalbi.documentos', 'documentos')}`}
          icon={TrendingUp}
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.decomposicao', 'Decomposição Financeira')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Legend formatter={(v) => <span className="text-sm">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {financial.totalPendente === 0 && financial.totalVencido === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium">{t('legalbi.contaEmDia', 'Conta em dia')}</p>
            <p className="text-sm text-muted-foreground">{t('legalbi.semPendentes', 'Não existem valores pendentes')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Expirations Tab ────────────────────────────────────────────────────────

function ExpirationsTab({ data }: { data: ReturnType<typeof useLegalBiStats> }) {
  const { expirations, portfolio } = data;
  const { t } = useTranslation();

  const TIPO_LABELS: Record<string, string> = {
    nda: 'NDA', prestacao_servicos: 'Prest. Serv.', fornecimento: 'Fornecimento',
    saas: 'SaaS', arrendamento: 'Arrend.', trabalho: 'Trabalho',
    licenciamento: 'Licenc.', parceria: 'Parceria', consultoria: 'Consult.', outro: 'Outro',
  };

  const RENOVACAO_LABELS: Record<string, string> = {
    renovacao_automatica: 'Auto',
    renovacao_mediante_acordo: 'Acordo',
    sem_renovacao_automatica: 'Sem Renov.',
  };

  // Aggregate expirations by month for chart
  const byMonth = useMemo(() => {
    const map: Record<string, { month: string; count: number; valor: number }> = {};
    expirations.forEach(e => {
      const m = format(new Date(e.dataTermo), 'MMM yy', { locale: pt });
      if (!map[m]) map[m] = { month: m, count: 0, valor: 0 };
      map[m].count++;
      map[m].valor += e.valor || 0;
    });
    return Object.values(map);
  }, [expirations]);

  const valorEmRisco = expirations.reduce((s, e) => s + (e.valor || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t('legalbi.expirar30', '< 30 Dias')}
          value={portfolio.contratosExpirar30}
          icon={AlertTriangle}
          variant={portfolio.contratosExpirar30 > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title={t('legalbi.expirar60', '< 60 Dias')}
          value={portfolio.contratosExpirar60}
          icon={Clock}
          variant={portfolio.contratosExpirar60 > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title={t('legalbi.pipeline', 'Pipeline (180d)')}
          value={expirations.length}
          icon={CalendarClock}
        />
        <KpiCard
          title={t('legalbi.valorRisco', 'Valor em Risco')}
          value={formatCurrency(valorEmRisco)}
          icon={Euro}
          variant={valorEmRisco > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Chart */}
      {byMonth.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.expiracoesPorMes', 'Expirações por Mês')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => name === 'valor' ? formatCurrency(v) : v} />
                  <Bar dataKey="count" name={t('legalbi.contratos', 'Contratos')} fill="hsl(20, 100%, 63%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('legalbi.listaExpiracoes', 'Contratos a Expirar')}</CardTitle>
          <CardDescription>{t('legalbi.proximos180', 'Próximos 180 dias')}</CardDescription>
        </CardHeader>
        <CardContent>
          {expirations.length === 0 ? (
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
                  {expirations.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 max-w-[200px] truncate font-medium">{e.titulo}</td>
                      <td className="py-2 max-w-[150px] truncate text-muted-foreground">{e.contraparte || '—'}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">{TIPO_LABELS[e.tipo] || e.tipo}</Badge>
                      </td>
                      <td className="py-2 text-right font-mono text-xs">{e.valor ? formatCurrency(e.valor) : '—'}</td>
                      <td className="py-2 text-right text-xs">{format(new Date(e.dataTermo), 'dd/MM/yyyy')}</td>
                      <td className="py-2 text-center">
                        <Badge
                          variant={e.diasRestantes <= 30 ? 'destructive' : e.diasRestantes <= 60 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {e.diasRestantes}d
                        </Badge>
                      </td>
                      <td className="py-2 text-center text-xs text-muted-foreground">
                        {e.renovacao ? RENOVACAO_LABELS[e.renovacao] || e.renovacao : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────────────

function DocumentsTab({ checklistItems, i18nLang }: {
  checklistItems: ReturnType<typeof useDocumentChecklist>['items'];
  i18nLang: string;
}) {
  const { t } = useTranslation();

  const uploaded = checklistItems.filter(i => i.entry?.status === 'uploaded').length;
  const expired = checklistItems.filter(i => i.entry?.status === 'expired').length;
  const expiringSoon = checklistItems.filter(i => i.entry?.status === 'expiring_soon').length;
  const missing = checklistItems.filter(i => !i.entry || i.entry.status === 'missing').length;
  const total = checklistItems.length;
  const percent = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  const statusData = [
    { name: t('docChecklist.uploaded'), value: uploaded, color: 'hsl(142, 71%, 45%)' },
    { name: t('docChecklist.expiringSoon'), value: expiringSoon, color: 'hsl(38, 92%, 50%)' },
    { name: t('docChecklist.expired'), value: expired, color: 'hsl(0, 84%, 60%)' },
    { name: t('docChecklist.missing'), value: missing, color: 'hsl(220, 14%, 60%)' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t('legalbi.docTotal', 'Total Documentos')}
          value={total}
          icon={ClipboardCheck}
        />
        <KpiCard
          title={t('docChecklist.uploaded')}
          value={uploaded}
          subtitle={`${percent}%`}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title={t('docChecklist.expired')}
          value={expired + expiringSoon}
          icon={AlertTriangle}
          variant={expired > 0 ? 'danger' : expiringSoon > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title={t('docChecklist.missing')}
          value={missing}
          icon={XCircle}
          variant={missing > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.docByStatus', 'Documentos por Estado')}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('legalbi.semDados')}</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('legalbi.docProgress', 'Progresso de Conformidade')}</CardTitle>
            <CardDescription>{t('docChecklist.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('docChecklist.progress', { count: uploaded, total })}</span>
                <span className="font-bold">{percent}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${percent}%` }}
                />
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
                      <span className="text-sm truncate">{i18nLang === 'en' && item.name_en ? item.name_en : item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.entry?.validity_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.entry.validity_date), 'dd/MM/yyyy')}
                        </span>
                      )}
                      <Badge
                        variant={status === 'uploaded' ? 'default' : status === 'expired' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {t(`docChecklist.${status === 'expiring_soon' ? 'expiringSoon' : status}`)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LegalBi() {
  const { t, i18n } = useTranslation();
  const data = useLegalBiStats();
  const { currentOrganization, isCCAInternalAuthorized, viewingOrganizationId } = useOrganizations();
  const { cliente } = useCliente();
  const { items: checklistItems, isTableAvailable: checklistAvailable } = useDocumentChecklist();

  // Para utilizadores CCA internos, usar o org do cliente em visualização.
  // Para utilizadores externos, currentOrganization é o correcto.
  const effectiveOrgId = isCCAInternalAuthorized
    ? (viewingOrganizationId ?? cliente?.organizationId ?? null)
    : currentOrganization?.id ?? null;

  const { data: viewingOrg } = useQuery({
    queryKey: ['legalbi-org-url', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('legalbi_url')
        .eq('id', effectiveOrgId)
        .maybeSingle();
      return data as { legalbi_url?: string | null } | null;
    },
    enabled: !!effectiveOrgId,
    staleTime: 2 * 60 * 1000,
  });

  const legalbiUrl = isCCAInternalAuthorized
    ? (viewingOrg?.legalbi_url ?? null)
    : ((currentOrganization as any)?.legalbi_url as string | null | undefined);

  if (data.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              {t('legalbi.title', 'LegalBI')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('legalbi.subtitle', 'Business Intelligence jurídico — visão integrada da carteira')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportPDFButton contentId="legalbi-content" filename="LegalBI" />
            {legalbiUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(legalbiUrl, '_blank', 'noopener,noreferrer')}
                className="shrink-0 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('legalbi.openExternal', 'Abrir LegalBI externo')}
              </Button>
            )}
          </div>
        </div>

        <div id="legalbi-content">
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="portfolio" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {t('legalbi.tabPortfolio', 'Carteira')}
            </TabsTrigger>
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

          <TabsContent value="portfolio" className="mt-6">
            <PortfolioTab data={data} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-6">
            <ComplianceTab data={data} />
          </TabsContent>
          <TabsContent value="financial" className="mt-6">
            <FinancialTab data={data} />
          </TabsContent>
          <TabsContent value="expirations" className="mt-6">
            <ExpirationsTab data={data} />
          </TabsContent>
          {checklistAvailable && checklistItems.length > 0 && (
            <TabsContent value="documents" className="mt-6">
              <DocumentsTab checklistItems={checklistItems} i18nLang={i18n.language} />
            </TabsContent>
          )}
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
