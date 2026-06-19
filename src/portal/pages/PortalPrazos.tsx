import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalPrazos() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.deadlines.eyebrow')}
      title={t('portal.pages.deadlines.title')}
      description={t('portal.pages.deadlines.description')}
      upcoming={t('portal.pages.deadlines.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
