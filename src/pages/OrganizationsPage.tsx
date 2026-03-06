import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import OrganizationSearch from '@/components/organizations/OrganizationSearch';

const OrganizationsPage = () => {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-serif">{t('organizations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('organizations.subtitle')}</p>
        </div>

        <OrganizationSearch />
      </div>
    </AppLayout>
  );
};

export default OrganizationsPage;
