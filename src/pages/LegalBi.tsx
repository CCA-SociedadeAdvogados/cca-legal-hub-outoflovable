import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { useContratos } from '@/hooks/useContratos';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { ExternalLink, Loader2 } from 'lucide-react';
import { CCACardHeader, Eyebrow, GhostButton, KPI } from '@/components/cca';
import { cn } from '@/lib/utils';

const TIPO_LABELS: Record<string, string> = {
  nda: 'NDA',
  prestacao_servicos: 'Prestação de serviços',
  fornecimento: 'Fornecimento',
  saas: 'SaaS',
  arrendamento: 'Arrendamento',
  trabalho: 'Trabalho',
  licenciamento: 'Licenciamento',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

const eurCompact = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const eurFull = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Return the last 8 quarters in order (oldest → newest) ending at the current quarter. */
function getLast8Quarters(
  now: Date,
): Array<{ key: string; label: string; year: number; q: number }> {
  const out: Array<{ key: string; label: string; year: number; q: number }> = [];
  let year = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < 8; i++) {
    out.unshift({ key: `${year}-Q${q}`, label: `Q${q}/${String(year).slice(2)}`, year, q });
    q--;
    if (q === 0) {
      q = 4;
      year--;
    }
  }
  return out;
}

function quarterOfDate(d: Date) {
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

export default function LegalBi() {
  const { t } = useTranslation();
  const { currentOrganization, isCCAInternalAuthorized, viewingOrganizationId } =
    useOrganizations();
  const { cliente } = useCliente();
  const { contratos, isLoading: isLoadingContratos } = useContratos();

  const effectiveOrgId = isCCAInternalAuthorized
    ? (viewingOrganizationId ?? cliente?.organizationId ?? null)
    : (currentOrganization?.id ?? null);

  const { data: viewingOrg, isLoading: isLoadingOrg } = useQuery({
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

  const externalBIUrl =
    (isCCAInternalAuthorized ? viewingOrg?.legalbi_url : currentOrganization?.legalbi_url) ||
    'https://bi.cca.law/Identity/Account/Login';

  /** KPIs, bar chart and area distribution computed from real contract data. */
  const analytics = useMemo(() => {
    const list = (contratos ?? []).filter((c) => !c.arquivado);
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    const active = list.filter((c) => c.estado_contrato === 'activo');
    const valueActive = active.reduce((sum, c) => sum + Number(c.valor_total_estimado ?? 0), 0);
    const expiring30 = active.filter((c) => {
      if (!c.data_termo) return false;
      const d = new Date(c.data_termo);
      return d >= now && d <= in30;
    }).length;
    const avgValue = active.length > 0 ? valueActive / active.length : 0;

    // Bar chart: sum of valor_total_estimado of contracts whose data_inicio_vigencia
    // falls inside each of the last 8 quarters. Fallback to created_at when missing.
    const quarters = getLast8Quarters(now);
    const buckets: Record<string, number> = {};
    quarters.forEach((q) => (buckets[q.key] = 0));
    list.forEach((c) => {
      const ref = c.data_inicio_vigencia ?? c.created_at;
      if (!ref) return;
      const { year, q } = quarterOfDate(new Date(ref));
      const key = `${year}-Q${q}`;
      if (key in buckets) {
        buckets[key] += Number(c.valor_total_estimado ?? 0);
      }
    });
    const bars = quarters.map((q) => ({ ...q, value: buckets[q.key] }));
    const maxBar = Math.max(...bars.map((b) => b.value), 1);

    // Distribution by tipo_contrato (only non-archived active+others)
    const tipoCounts = list.reduce<Record<string, number>>((acc, c) => {
      const k = c.tipo_contrato ?? 'outro';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const totalForPct = list.length || 1;
    const distribution = Object.entries(tipoCounts)
      .map(([key, count]) => ({
        key,
        label: TIPO_LABELS[key] ?? key,
        count,
        pct: Math.round((count / totalForPct) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      kpiActive: active.length,
      kpiValueActive: valueActive,
      kpiExpiring30: expiring30,
      kpiAvgValue: avgValue,
      bars,
      maxBar,
      distribution,
    };
  }, [contratos]);

  const isLoading = isLoadingContratos || isLoadingOrg;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>LegalBI</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              Indicadores <span className="italic text-brand">jurídicos</span>
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t(
                'legalbi.subtitle',
                'Business Intelligence jurídico — visão integrada da carteira',
              )}
            </p>
          </header>
          <GhostButton
            onClick={() => window.open(externalBIUrl, '_blank', 'noopener,noreferrer')}
            className="h-9"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir BI completo
          </GhostButton>
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Contratos activos"
            value={analytics.kpiActive}
            delta={analytics.kpiActive > 0 ? `${analytics.kpiActive} em carteira` : '—'}
            trend="flat"
          />
          <KPI
            label="Valor activo"
            value={eurCompact.format(analytics.kpiValueActive)}
            delta={`média ${eurCompact.format(analytics.kpiAvgValue)}`}
            trend="flat"
          />
          <KPI
            label="A expirar em 30 dias"
            value={analytics.kpiExpiring30}
            delta={analytics.kpiExpiring30 > 0 ? 'atenção' : 'ok'}
            trend={analytics.kpiExpiring30 > 0 ? 'warn' : 'flat'}
          />
          <KPI
            label="Tipos diferentes"
            value={analytics.distribution.length}
            delta="catálogo"
            trend="flat"
          />
        </div>

        {/* Grid: quarterly bar chart + distribution */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Bar chart */}
          <Card>
            <CCACardHeader eyebrow="Trimestre" title="Valor contratual por trimestre" />
            <div className="px-6 py-6">
              <BarChart bars={analytics.bars} max={analytics.maxBar} />
            </div>
          </Card>

          {/* Distribution by area */}
          <Card>
            <CCACardHeader eyebrow="Carteira" title="Distribuição por área" />
            <div className="space-y-4 px-6 py-6">
              {analytics.distribution.length === 0 ? (
                <p className="text-[13px] text-ink-mute">Sem dados de carteira para apresentar.</p>
              ) : (
                analytics.distribution.map((row) => (
                  <div key={row.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-ink">{row.label}</span>
                      <span className="shrink-0 font-mono text-[11.5px] text-ink-mute">
                        {row.count} · {row.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-alt">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-500"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

type BarChartProps = {
  bars: Array<{ key: string; label: string; value: number }>;
  max: number;
};

/** Lightweight bar chart — last bar highlighted in brand accent. */
function BarChart({ bars, max }: BarChartProps) {
  const chartHeight = 180;
  return (
    <div className="space-y-3">
      <div className="flex h-[180px] items-end gap-2 sm:gap-3">
        {bars.map((bar, i) => {
          const isLast = i === bars.length - 1;
          const heightPx = max > 0 ? Math.max((bar.value / max) * chartHeight, 2) : 2;
          return (
            <div key={bar.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    'w-full rounded-t-[2px] transition-[height] duration-500',
                    isLast ? 'bg-brand' : 'bg-ink/15 group-hover:bg-ink/25',
                  )}
                  style={{ height: `${heightPx}px` }}
                  title={eurFull.format(bar.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-3">
        {bars.map((bar, i) => (
          <div
            key={bar.key}
            className={cn(
              'flex-1 text-center font-mono text-[10px]',
              i === bars.length - 1 ? 'font-medium text-brand' : 'text-ink-mute',
            )}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  );
}
