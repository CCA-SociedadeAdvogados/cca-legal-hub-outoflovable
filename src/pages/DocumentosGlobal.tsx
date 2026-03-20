import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { DocumentChecklistPanel } from '@/components/documents/DocumentChecklistPanel';
import { useEnsureClientFolder } from '@/hooks/useSharePoint';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

export default function DocumentosGlobal() {
  const { t } = useTranslation();
  const { profile } = useProfile();

  const organizationId = profile?.current_organization_id ?? null;
  const { folderPath, isReady, isEnsuring } = useEnsureClientFolder(organizationId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('documentsGlobal.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('documentsGlobal.subtitle')}
          </p>
        </div>

        {/* Document Checklist */}
        <DocumentChecklistPanel />

        <div className="mt-6">
          {isEnsuring && !isReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SharePointDocumentsBrowser
              initialPath={isReady ? folderPath : undefined}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
