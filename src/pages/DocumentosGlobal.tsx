import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { DocumentChecklistPanel } from '@/components/documents/DocumentChecklistPanel';
import { useEnsureClientFolder } from '@/hooks/useSharePoint';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { Loader2 } from 'lucide-react';

export default function DocumentosGlobal() {
  const { t } = useTranslation();

  const { viewingOrganizationId } = useCliente();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();

  // Same org resolution pattern as useDocumentChecklist
  const effectiveOrgId =
    viewingOrganizationId ||
    (isCCAInternalAuthorized ? null : currentOrganization?.id) ||
    null;

  const { folderPath, isReady, isEnsuring } = useEnsureClientFolder(effectiveOrgId);

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

        {/* Document Checklist — passes upload folder so "Registar" can upload to SharePoint */}
        <DocumentChecklistPanel
          uploadFolderPath={isReady ? folderPath : undefined}
          uploadOrgId={effectiveOrgId ?? undefined}
        />

        <div className="mt-6">
          {isEnsuring && !isReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SharePointDocumentsBrowser
              overrideOrgId={effectiveOrgId ?? undefined}
              initialPath={isReady ? folderPath : undefined}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
