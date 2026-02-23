import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LinkIcon, 
  FileText, 
  Folder, 
  Calendar, 
  Scale, 
  Shield, 
  Users, 
  Settings,
  BarChart3,
  Newspaper,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickLinksWidgetProps {
  title: string;
  config: Record<string, unknown>;
}

interface QuickLink {
  label: string;
  path: string;
  icon?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Folder,
  Calendar,
  Scale,
  Shield,
  Users,
  Settings,
  BarChart3,
  Newspaper,
  DollarSign,
  Link: LinkIcon,
};

const pathLabelKeyMap: Record<string, string> = {
  '/contratos': 'home.quickLinks.contracts',
  '/contratos/documentos': 'home.quickLinks.documents',
  '/eventos': 'home.quickLinks.events',
  '/normativos': 'home.quickLinks.legislation',
};

const defaultLinks: QuickLink[] = [
  { label: 'Contratos', path: '/contratos', icon: 'FileText' },
  { label: 'Documentos', path: '/contratos/documentos', icon: 'Folder' },
  { label: 'Eventos', path: '/eventos', icon: 'Calendar' },
  { label: 'Normativos', path: '/normativos', icon: 'Scale' },
];

const QuickLinksWidget = forwardRef<HTMLDivElement, QuickLinksWidgetProps>(
  function QuickLinksWidget({ title, config }, ref) {
    const { t } = useTranslation();
    const links = (config.links as QuickLink[]) || defaultLinks;

    const getTranslatedLabel = (link: QuickLink) => {
      const labelKey = pathLabelKeyMap[link.path];
      return labelKey ? t(labelKey) : link.label;
    };

    if (!links.length) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.quickLinks.noLinksConfigured')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {links.map((link, index) => {
              const Icon = iconMap[link.icon || 'Link'] || LinkIcon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  asChild
                  className="justify-start gap-2"
                >
                  <Link to={link.path}>
                    <Icon className="h-4 w-4" />
                    {getTranslatedLabel(link)}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default QuickLinksWidget;
