import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentosGerados } from '@/hooks/useDocumentosGerados';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { CCACardHeader } from '@/components/cca';

interface RecentDocumentsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const RecentDocumentsWidget = forwardRef<HTMLDivElement, RecentDocumentsWidgetProps>(
  function RecentDocumentsWidget({ title, config }, ref) {
    const { t, i18n } = useTranslation();
    const { documentos, isLoading } = useDocumentosGerados();

    const limit = (config.limit as number) || 5;
    const showDate = config.showDate !== false;
    const dateLocale = i18n.language === 'pt' ? pt : enUS;

    const recentDocuments =
      documentos
        ?.slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit) || [];

    const viewAll = (
      <Link
        to="/documentos"
        className="inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[0.01em] text-brand hover:text-brand-strong"
      >
        {t('home.viewAll')}
        <ArrowRight className="h-3 w-3" />
      </Link>
    );

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Documentos" title={title} />
          <div className="space-y-3 px-5 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-8 w-8 rounded bg-bg-alt" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 rounded bg-bg-alt" />
                  <div className="h-3 w-1/4 rounded bg-bg-alt" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    // Sem documentos: ocultar o widget.
    if (recentDocuments.length === 0) {
      return null;
    }

    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Documentos" title={title} action={viewAll} />
        <ul className="divide-y divide-line-soft">
          {recentDocuments.map((doc) => (
            <li key={doc.id}>
              <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-alt">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line bg-bg-alt">
                  <FileText className="h-4 w-4 text-brand" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[14px] font-medium leading-tight text-ink">
                    {doc.nome}
                  </p>
                  {showDate && (
                    <p className="mt-0.5 font-mono text-[11px] text-ink-mute">
                      {format(new Date(doc.created_at), "d 'de' MMM yyyy", { locale: dateLocale })}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  },
);

export default RecentDocumentsWidget;
