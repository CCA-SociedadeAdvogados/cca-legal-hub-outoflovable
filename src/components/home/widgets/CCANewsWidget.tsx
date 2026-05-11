import { useState, useEffect, forwardRef, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { useCCANews, type CCANews } from '@/hooks/useCCANews';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CCACardHeader, Pill } from '@/components/cca';

interface CCANewsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const CCANewsWidget = forwardRef<HTMLDivElement, CCANewsWidgetProps>(function CCANewsWidget(
  { title, config },
  ref,
) {
  const { t, i18n } = useTranslation();
  const { news, isLoading } = useCCANews();
  const { translate, needsTranslation } = useContentTranslation();
  const [translatedContent, setTranslatedContent] = useState<
    Record<string, { titulo: string; resumo: string }>
  >({});

  const limit = (config.limit as number) || 3;
  const showDate = config.showDate !== false;
  const dateLocale = i18n.language === 'pt' ? pt : enUS;

  // Memoize published news to avoid re-render loops
  const publishedNews = useMemo(
    () => news?.filter((n) => n.estado === 'publicado').slice(0, limit) ?? [],
    [news, limit],
  );

  // Stable key for useEffect dependency
  const newsIds = useMemo(() => publishedNews.map((n) => n.id).join(','), [publishedNews]);

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
        const textsToTranslate = publishedNews.flatMap((n) => [n.titulo, n.resumo || '']);
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

    return () => {
      cancelled = true;
    };
  }, [needsTranslation, newsIds, publishedNews]);

  const getContent = (item: CCANews) => {
    if (needsTranslation && translatedContent[item.id]) {
      return translatedContent[item.id];
    }
    return { titulo: item.titulo, resumo: item.resumo || '' };
  };

  const viewAll = (
    <Link
      to="/novidades-cca"
      className="inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[0.01em] text-brand hover:text-brand-strong"
    >
      {t('home.viewAll')}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );

  if (isLoading) {
    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Novidades" title={title} />
        <div className="space-y-3 px-5 py-4">
          {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-1.5 h-4 w-3/4 rounded bg-bg-alt" />
              <div className="h-3 w-1/2 rounded bg-bg-alt" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!publishedNews?.length) {
    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Novidades" title={title} />
        <p className="px-5 py-5 text-[13px] text-ink-mute">{t('home.noNews')}</p>
      </Card>
    );
  }

  return (
    <Card ref={ref}>
      <CCACardHeader eyebrow="Novidades" title={title} action={viewAll} />
      <ul className="divide-y divide-line-soft">
        {publishedNews.map((item) => (
          <li key={item.id} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              {showDate && item.data_publicacao && (
                <Pill tone="default" className="mt-0.5 shrink-0 font-mono">
                  {format(new Date(item.data_publicacao), 'dd MMM', { locale: dateLocale })}
                </Pill>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-1 font-display text-[14.5px] font-medium leading-tight text-ink">
                  {getContent(item).titulo}
                </h4>
                {getContent(item).resumo && (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-ink-soft">
                    {getContent(item).resumo}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
});

export default CCANewsWidget;
