import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Shield, Building, MapPin, Users } from 'lucide-react';

const DOC_CATEGORIES = [
  { icon: Shield, key: 'certidao_permanente' },
  { icon: Building, key: 'rcbe' },
  { icon: Users, key: 'identification' },
  { icon: MapPin, key: 'proof_of_address' },
] as const;

export default function ManagementDocs() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('managementDocs.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('managementDocs.subtitle')}
          </p>
        </div>

        {/* Document categories info */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_CATEGORIES.map(({ icon: Icon, key }) => (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t(`managementDocs.docTypes.${key}`)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* SharePoint browser scoped to Management_Docs folder */}
        <div className="mt-6">
          <SharePointDocumentsBrowser rootSubfolder="Management_Docs" />
        </div>
      </div>
    </AppLayout>
  );
}
