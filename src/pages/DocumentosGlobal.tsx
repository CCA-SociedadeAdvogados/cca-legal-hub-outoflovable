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

  // Org being viewed (client or own org for external users)
  const effectiveOrgId =
    viewingOrganizationId ||
    (isCCAInternalAuthorized ? null : currentOrganization?.id) ||
    null;

  // Org that owns the SharePoint config.
  // Only CCA (C.0000) has a sharepoint_config row — all client sub-orgs do NOT.
  // CCA internal users must use CCA's own org ID to resolve the config; external users use their own org.
  const configOrgId = isCCAInternalAuthorized
    ? (currentOrganization?.id ?? null)
    : effectiveOrgId;

  // folderPath derived from the viewed client's client_code (e.g. /C.4859)
  // configOrgId provides the SharePoint connection to use
  const { folderPath, isReady, isEnsuring } = useEnsureClientFolder(effectiveOrgId, configOrgId);

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

        {/* Document Checklist — upload uses configOrgId (has SharePoint) + client subfolder */}
        <DocumentChecklistPanel
          uploadFolderPath={effectiveOrgId ? folderPath : undefined}
          uploadOrgId={configOrgId ?? undefined}
        />

        <div className="mt-6">
          {isEnsuring && !isReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SharePointDocumentsBrowser
              overrideOrgId={configOrgId ?? undefined}
              initialPath={isReady ? folderPath : undefined}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
