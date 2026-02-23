import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { WidgetConfig, WidgetType } from '@/lib/defaultHomeLayout';

// Lazy load widget components
const OrganizationCard = lazy(() => import('./widgets/OrganizationCard'));
const LawyerCard = lazy(() => import('./widgets/LawyerCard'));
const CCANewsWidget = lazy(() => import('./widgets/CCANewsWidget'));
const RecentContractsWidget = lazy(() => import('./widgets/RecentContractsWidget'));
const RecentDocumentsWidget = lazy(() => import('./widgets/RecentDocumentsWidget'));
const ExpiringContractsWidget = lazy(() => import('./widgets/ExpiringContractsWidget'));
const QuickLinksWidget = lazy(() => import('./widgets/QuickLinksWidget'));
const WelcomeMessageWidget = lazy(() => import('./widgets/WelcomeMessageWidget'));
const LegalInsightsWidget = lazy(() => import('./widgets/LegalInsightsWidget'));

interface WidgetRendererProps {
  widget: WidgetConfig;
  organizationId: string | null;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

function WidgetError({ title, errorMessage }: { title: string; errorMessage: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {errorMessage}
        </p>
      </CardContent>
    </Card>
  );
}

const widgetTitleKeyMap: Record<WidgetType, string> = {
  'WELCOME_MESSAGE': 'home.widgetTitles.welcome',
  'ORGANIZATION_CARD': 'home.widgetTitles.organization',
  'LAWYER_CARD': 'home.widgetTitles.lawyer',
  'CCA_NEWS': 'home.widgetTitles.news',
  'RECENT_CONTRACTS': 'home.widgetTitles.recentContracts',
  'RECENT_DOCUMENTS': 'home.widgetTitles.recentDocuments',
  'EXPIRING_CONTRACTS': 'home.widgetTitles.expiringContracts',
  'QUICK_LINKS': 'home.widgetTitles.quickLinks',
  'LEGAL_INSIGHTS': 'home.widgetTitles.legalInsights',
};

export function WidgetRenderer({ widget, organizationId }: WidgetRendererProps) {
  const { t } = useTranslation();
  
  const getTranslatedTitle = () => {
    const titleKey = widgetTitleKeyMap[widget.type];
    return titleKey ? t(titleKey) : widget.title;
  };
  
  const translatedTitle = getTranslatedTitle();
  
  const renderWidget = () => {
    switch (widget.type) {
      case 'ORGANIZATION_CARD':
        return (
          <OrganizationCard
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'LAWYER_CARD':
        return (
          <LawyerCard
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'CCA_NEWS':
        return (
          <CCANewsWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'RECENT_CONTRACTS':
        return (
          <RecentContractsWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'RECENT_DOCUMENTS':
        return (
          <RecentDocumentsWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'EXPIRING_CONTRACTS':
        return (
          <ExpiringContractsWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'QUICK_LINKS':
        return (
          <QuickLinksWidget
            title={translatedTitle}
            config={widget.config}
          />
        );
      case 'WELCOME_MESSAGE':
        return (
          <WelcomeMessageWidget
            key={`welcome-${organizationId}`}
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      case 'LEGAL_INSIGHTS':
        return (
          <LegalInsightsWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      default:
        return <WidgetError title={widget.title} errorMessage={t('home.widgetLoadError')} />;
    }
  };

  return (
    <Suspense fallback={<WidgetSkeleton />}>
      {renderWidget()}
    </Suspense>
  );
}
