import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalHome() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.home.eyebrow')}
      title={t('portal.pages.home.title')}
      description={t('portal.pages.home.description')}
      upcoming={t('portal.pages.home.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
