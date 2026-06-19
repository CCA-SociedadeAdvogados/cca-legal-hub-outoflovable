import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalDocumentos() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.documents.eyebrow')}
      title={t('portal.pages.documents.title')}
      description={t('portal.pages.documents.description')}
      upcoming={t('portal.pages.documents.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
