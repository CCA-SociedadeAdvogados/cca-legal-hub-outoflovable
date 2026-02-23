import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Folder, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentosGerados } from '@/hooks/useDocumentosGerados';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

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

    const recentDocuments = documentos
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) || [];

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

    if (recentDocuments.length === 0) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-serif">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Folder className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('home.noDocuments')}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/documentos">{t('home.viewDocuments')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold font-serif">{title}</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link to="/documentos">
              {t('home.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.nome}</p>
                  {showDate && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "d 'de' MMM", { locale: dateLocale })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default RecentDocumentsWidget;
