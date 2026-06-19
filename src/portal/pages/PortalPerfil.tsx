import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalPerfil() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.profile.eyebrow')}
      title={t('portal.pages.profile.title')}
      description={t('portal.pages.profile.description')}
      upcoming={t('portal.pages.profile.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
