import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
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
const MonthlySummaryWidget = lazy(() => import('./widgets/MonthlySummaryWidget'));

interface WidgetRendererProps {
  widget: WidgetConfig;
  organizationId: string | null;
}

function WidgetSkeleton() {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="mb-1.5 h-2.5 w-16" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-3 px-5 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}

function WidgetError({ title, errorMessage }: { title: string; errorMessage: string }) {
  return (
    <Card className="border-danger/40">
      <div className="border-b border-danger/30 px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-medium text-danger">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.6} />
          {title}
        </h3>
      </div>
      <p className="px-5 py-4 text-[13px] text-ink-mute">{errorMessage}</p>
    </Card>
  );
}

const widgetTitleKeyMap: Record<WidgetType, string> = {
  WELCOME_MESSAGE: 'home.widgetTitles.welcome',
  ORGANIZATION_CARD: 'home.widgetTitles.organization',
  LAWYER_CARD: 'home.widgetTitles.lawyer',
  CCA_NEWS: 'home.widgetTitles.news',
  RECENT_CONTRACTS: 'home.widgetTitles.recentContracts',
  RECENT_DOCUMENTS: 'home.widgetTitles.recentDocuments',
  EXPIRING_CONTRACTS: 'home.widgetTitles.expiringContracts',
  QUICK_LINKS: 'home.widgetTitles.quickLinks',
  LEGAL_INSIGHTS: 'home.widgetTitles.legalInsights',
  MONTHLY_SUMMARY: 'home.widgetTitles.monthlySummary',
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
        return <QuickLinksWidget title={translatedTitle} config={widget.config} />;
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
      case 'MONTHLY_SUMMARY':
        return (
          <MonthlySummaryWidget
            title={translatedTitle}
            config={widget.config}
            organizationId={organizationId}
          />
        );
      default:
        return <WidgetError title={widget.title} errorMessage={t('home.widgetLoadError')} />;
    }
  };

  return <Suspense fallback={<WidgetSkeleton />}>{renderWidget()}</Suspense>;
}
