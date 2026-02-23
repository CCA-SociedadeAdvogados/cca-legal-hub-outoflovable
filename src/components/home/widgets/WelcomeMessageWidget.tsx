import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useContentBlock } from '@/hooks/useContentBlocks';

interface WelcomeMessageWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const WelcomeMessageWidget = forwardRef<HTMLDivElement, WelcomeMessageWidgetProps>(
  function WelcomeMessageWidget({ title, config, organizationId }, ref) {
    const { t } = useTranslation();
    const contentKey = (config.contentBlockKey as string) || 'welcome_message';
    const { block, isLoading } = useContentBlock(organizationId, contentKey);

    if (isLoading) {
      return (
        <Card ref={ref} className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default welcome message if no custom block exists
    const displayTitle = block?.title || t('home.welcomeTitle');
    const displayContent = block?.content || t('home.welcomeDescription');

    return (
      <Card ref={ref} className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {displayContent}
          </p>
        </CardContent>
      </Card>
    );
  }
);

export default WelcomeMessageWidget;
