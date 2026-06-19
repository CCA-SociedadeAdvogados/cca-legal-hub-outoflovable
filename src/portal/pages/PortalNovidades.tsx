import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalNovidades() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.news.eyebrow')}
      title={t('portal.pages.news.title')}
      description={t('portal.pages.news.description')}
      upcoming={t('portal.pages.news.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
