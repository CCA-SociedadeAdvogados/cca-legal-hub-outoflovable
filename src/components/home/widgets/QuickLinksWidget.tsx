import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import {
  Link as LinkIcon,
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
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CCACardHeader } from '@/components/cca';

interface QuickLinksWidgetProps {
  title: string;
  config: Record<string, unknown>;
}

interface QuickLink {
  label: string;
  path: string;
  icon?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
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
          <CCACardHeader eyebrow="Atalhos" title={title} />
          <p className="px-5 py-5 text-[13px] text-ink-mute">
            {t('home.quickLinks.noLinksConfigured')}
          </p>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Atalhos" title={title} />
        <div className="grid grid-cols-2 gap-2 px-5 py-5">
          {links.map((link, index) => {
            const Icon = iconMap[link.icon || 'Link'] || LinkIcon;
            return (
              <Link
                key={index}
                to={link.path}
                className="group flex items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-brand hover:bg-bg-alt"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.5} />
                  <span className="truncate">{getTranslatedLabel(link)}</span>
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.5}
                />
              </Link>
            );
          })}
        </div>
      </Card>
    );
  },
);

export default QuickLinksWidget;
