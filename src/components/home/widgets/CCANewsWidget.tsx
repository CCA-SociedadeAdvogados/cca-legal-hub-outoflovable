import { useState, useEffect, forwardRef, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowRight, Calendar } from 'lucide-react';
import { useCCANews, type CCANews } from '@/hooks/useCCANews';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CCANewsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const CCANewsWidget = forwardRef<HTMLDivElement, CCANewsWidgetProps>(
  function CCANewsWidget({ title, config }, ref) {
    const { t, i18n } = useTranslation();
    const { news, isLoading } = useCCANews();
    const { translate, needsTranslation } = useContentTranslation();
    const [translatedContent, setTranslatedContent] = useState<Record<string, { titulo: string; resumo: string }>>({});
    
    const limit = (config.limit as number) || 3;
    const showDate = config.showDate !== false;
    const dateLocale = i18n.language === 'pt' ? pt : enUS;

    // Memoize published news to avoid re-render loops
    const publishedNews = useMemo(() => 
      news?.filter(n => n.estado === 'publicado').slice(0, limit) ?? [],
      [news, limit]
    );

    // Stable key for useEffect dependency
    const newsIds = useMemo(() => 
      publishedNews.map(n => n.id).join(','),
      [publishedNews]
    );

    // Stable reference to translate function
    const translateRef = useRef(translate);
    translateRef.current = translate;

    // Translate widget news content
    useEffect(() => {
      if (!publishedNews.length) {
        setTranslatedContent({});
        return;
      }

      if (!needsTranslation) {
        setTranslatedContent({});
        return;
      }

      let cancelled = false;

      const translateNews = async () => {
        try {
          const textsToTranslate = publishedNews.flatMap(n => [n.titulo, n.resumo || '']);
          const translated = await translateRef.current(textsToTranslate, 'platform news');
          
          if (cancelled) return;
          
          const newTranslated: Record<string, { titulo: string; resumo: string }> = {};
          publishedNews.forEach((n, i) => {
            newTranslated[n.id] = {
              titulo: translated[i * 2] || n.titulo,
              resumo: translated[i * 2 + 1] || n.resumo || '',
            };
          });
          setTranslatedContent(newTranslated);
        } catch {
          // Silently ignore aborted translations
        }
      };

      translateNews();
      
      return () => { cancelled = true; };
    }, [needsTranslation, newsIds]);

    const getContent = (item: CCANews) => {
      if (needsTranslation && translatedContent[item.id]) {
        return translatedContent[item.id];
      }
      return { titulo: item.titulo, resumo: item.resumo || '' };
    };

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].slice(0, limit).map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!publishedNews?.length) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.noNews')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/novidades-cca" className="gap-1">
              {t('home.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {publishedNews.map((item) => (
              <div key={item.id} className="border-b pb-2 last:border-0 last:pb-0">
                <h4 className="text-sm font-medium line-clamp-1">{getContent(item).titulo}</h4>
                {getContent(item).resumo && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {getContent(item).resumo}
                  </p>
                )}
                {showDate && item.data_publicacao && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.data_publicacao), i18n.language === 'pt' ? "d 'de' MMMM" : "MMMM d", { locale: dateLocale })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default CCANewsWidget;
