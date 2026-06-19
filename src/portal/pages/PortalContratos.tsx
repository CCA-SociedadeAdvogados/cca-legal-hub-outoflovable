import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalContratos() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.contracts.eyebrow')}
      title={t('portal.pages.contracts.title')}
      description={t('portal.pages.contracts.description')}
      upcoming={t('portal.pages.contracts.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
