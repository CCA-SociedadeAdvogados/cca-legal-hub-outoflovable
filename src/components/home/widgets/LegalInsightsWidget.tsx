import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { ArrowRight, Lightbulb, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

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

const areaOfLawColors: Record<string, string> = {
  laboral: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fiscal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  comercial: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  protecao_dados: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ambiente: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  seguranca_trabalho: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  societario: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  outro: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export default function LegalInsightsWidget({ title, config, organizationId }: LegalInsightsWidgetProps) {
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

  const getAreaLabel = (area: string) => {
    return t(`areaOfLaw.${area.replace('_', '')}`, area);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('home.noLegalInsights', 'Sem novidades em Legal Insights')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <Link
                key={insight.id}
                to={`/eventos`}
                className="block p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {insight.titulo}
                    </p>
                    {insight.descricao_resumo && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {insight.descricao_resumo}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${areaOfLawColors[insight.area_direito] || areaOfLawColors.outro}`}
                      >
                        {getAreaLabel(insight.area_direito)}
                      </Badge>
                      {showDate && insight.data_publicacao && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(insight.data_publicacao), 'dd MMM yyyy', { locale })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}

            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link to="/eventos">
                  {t('dashboard.viewAll', 'Ver todos')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
