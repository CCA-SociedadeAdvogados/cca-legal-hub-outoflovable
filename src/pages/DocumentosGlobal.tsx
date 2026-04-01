import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { DocumentChecklistPanel } from '@/components/documents/DocumentChecklistPanel';
import { useEnsureClientFolder, useSharePointConfig } from '@/hooks/useSharePoint';
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

  // Check if the viewed client org has been provisioned (has its own sharepoint_config).
  // provision-client-sharepoint creates a per-client config with root_folder_path = /Clientes/{code} - {name}
  const { data: clientConfig, isLoading: isLoadingClientConfig } = useSharePointConfig(
    effectiveOrgId ?? undefined,
  );
  const clientIsProvisioned = !!clientConfig;

  // Org that owns the SharePoint config to use:
  // - Provisioned client → use client's own org (has sharepoint_config with its root_folder_path)
  // - Unprovisioned client viewed by CCA user → fall back to CCA's umbrella config
  // - External user → always their own org
  const configOrgId: string | null = (() => {
    if (!effectiveOrgId) return null;
    if (clientIsProvisioned) return effectiveOrgId;
    if (isCCAInternalAuthorized) return currentOrganization?.id ?? null;
    return effectiveOrgId;
  })();

  // For provisioned clients the root_folder_path already scopes to the client's folder tree,
  // so we start the browser at "/" and don't need a subfolder.
  // For unprovisioned clients using CCA's umbrella config we need a /{client_code} subfolder.
  const dataOrgIdForFolder = clientIsProvisioned ? null : effectiveOrgId;
  const { folderPath, isReady, isEnsuring } = useEnsureClientFolder(dataOrgIdForFolder, configOrgId);

  // Only offer SharePoint upload when there's actually a config available:
  // - provisioned client: their own config exists
  // - CCA internal user: umbrella config may exist
  // - external unprovisioned: no SharePoint → hide upload to avoid cryptic errors
  const canUploadToSharePoint = clientIsProvisioned || isCCAInternalAuthorized;

  // Path used in browser and uploads:
  // - Provisioned → "/" (root of client's own SharePoint space)
  // - Unprovisioned → "/{client_code}" subfolder within CCA's drive
  const browsePath = clientIsProvisioned ? '/' : folderPath;
  const browseReady = clientIsProvisioned ? !isLoadingClientConfig : isReady;
  const browseEnsuring = clientIsProvisioned ? isLoadingClientConfig : isEnsuring;

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

        {/* Document Checklist — upload uses configOrgId (has SharePoint) + correct folder */}
        <DocumentChecklistPanel
          uploadFolderPath={canUploadToSharePoint && effectiveOrgId ? browsePath : undefined}
          uploadOrgId={canUploadToSharePoint ? configOrgId ?? undefined : undefined}
        />

        <div className="mt-6">
          {browseEnsuring && !browseReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SharePointDocumentsBrowser
              overrideOrgId={configOrgId ?? undefined}
              initialPath={browseReady ? browsePath : undefined}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
