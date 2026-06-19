import { useTranslation } from 'react-i18next';
import { PortalPagePlaceholder } from '@/portal/components/PortalPagePlaceholder';

export default function PortalFinanceiro() {
  const { t } = useTranslation();
  return (
    <PortalPagePlaceholder
      eyebrow={t('portal.pages.financial.eyebrow')}
      title={t('portal.pages.financial.title')}
      description={t('portal.pages.financial.description')}
      upcoming={t('portal.pages.financial.upcoming', { returnObjects: true }) as string[]}
    />
  );
}
