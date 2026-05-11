import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { ArrowRight, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CCACardHeader, Pill } from '@/components/cca';

interface LegalInsightsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

interface LegalInsight {
  id: string;
  titulo: string;
  area_direito: string;
  data_publicacao: string | null;
  estado: string;
  descricao_resumo: string | null;
}

export default function LegalInsightsWidget({
  title,
  config,
  organizationId,
}: LegalInsightsWidgetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'pt' ? pt : enUS;

  const limit = (config.limit as number) || 5;
  const showDate = (config.showDate as boolean) ?? true;
  const filterArea = config.filterArea as string | undefined;

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['legal-insights-widget', organizationId, limit, filterArea],
    queryFn: async () => {
      let query = supabase
        .from('eventos_legislativos')
        .select('id, titulo, area_direito, data_publicacao, estado, descricao_resumo')
        .eq('estado', 'activo')
        .order('data_publicacao', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LegalInsight[];
    },
    enabled: true,
  });

  const getAreaLabel = (area: string) => t(`areaOfLaw.${area.replace('_', '')}`, area);

  const viewAll = (
    <Link
      to="/eventos"
      className="inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[0.01em] text-brand hover:text-brand-strong"
    >
      {t('dashboard.viewAll', 'Ver todos')}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );

  if (isLoading) {
    return (
      <Card>
        <CCACardHeader eyebrow="Legal Insights" title={title} />
        <div className="space-y-3 px-5 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-4 w-3/4 rounded bg-bg-alt" />
              <div className="h-3 w-1/2 rounded bg-bg-alt" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CCACardHeader eyebrow="Legal Insights" title={title} />
        <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
          <Scale className="mb-2 h-8 w-8 text-ink-mute opacity-60" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">
            {t('home.noLegalInsights', 'Sem novidades em Legal Insights')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CCACardHeader eyebrow="Legal Insights" title={title} action={viewAll} />
      <ul className="divide-y divide-line-soft">
        {insights.map((insight) => (
          <li key={insight.id}>
            <Link
              to="/eventos"
              className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-bg-alt"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Pill tone="active">{getAreaLabel(insight.area_direito)}</Pill>
                <p className="line-clamp-2 font-display text-[14.5px] font-medium leading-tight text-ink transition-colors group-hover:text-brand">
                  {insight.titulo}
                </p>
                {insight.descricao_resumo && (
                  <p className="line-clamp-1 text-[12px] leading-[1.5] text-ink-soft">
                    {insight.descricao_resumo}
                  </p>
                )}
                {showDate && insight.data_publicacao && (
                  <p className="font-mono text-[11px] text-ink-mute">
                    {format(new Date(insight.data_publicacao), 'dd MMM yyyy', { locale })}
                  </p>
                )}
              </div>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100"
                strokeWidth={1.5}
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
