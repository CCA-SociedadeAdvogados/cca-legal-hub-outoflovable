import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import {
  Folder,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Cloud,
} from 'lucide-react';
import { useSharePointConfig, useSharePointDocuments } from '@/hooks/useSharePoint';
import { cn } from '@/lib/utils';
import { dateFnsLocale } from '@/portal/lib/contrato';

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
};

function getFileIcon(extension: string | null): React.ElementType {
  if (!extension) return File;
  return FILE_ICONS[extension.toLowerCase()] || File;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Browser de documentos read-only para o cliente. Lê os documentos do SharePoint
 * já sincronizados (tabela sharepoint_documents), scopados à organização do cliente
 * via RLS. Sem sincronização manual nem upload — operações que ficam do lado da CCA.
 */
export function PortalDocumentsBrowser() {
  const { t, i18n } = useTranslation();
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig();
  const { data: documents, isLoading: isLoadingDocs } = useSharePointDocuments(currentPath);

  const locale = dateFnsLocale(i18n.language);
  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  const navigateToFolder = (folderPath: string) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length === 0) return;
    const newHistory = [...pathHistory];
    const previousPath = newHistory.pop()!;
    setPathHistory(newHistory);
    setCurrentPath(previousPath);
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-ink-mute" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
        <Cloud className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-ink">{t('portal.documents.notReady')}</p>
        <p className="mt-1 max-w-md text-[12.5px] text-ink-mute">
          {t('portal.documents.notReadyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="min-w-0 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 text-[12.5px]">
          <button
            type="button"
            onClick={() => {
              setCurrentPath('/');
              setPathHistory([]);
            }}
            disabled={currentPath === '/'}
            className="rounded-control px-2 py-1 font-medium text-ink-mute transition-colors hover:text-ink disabled:text-ink disabled:hover:text-ink"
          >
            {t('portal.documents.root')}
          </button>
          {breadcrumbParts.map((part, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
              <button
                type="button"
                onClick={() => {
                  const newPath = '/' + breadcrumbParts.slice(0, index + 1).join('/');
                  if (newPath !== currentPath) {
                    setPathHistory([...pathHistory, currentPath]);
                    setCurrentPath(newPath);
                  }
                }}
                className="rounded-control px-2 py-1 text-ink-mute transition-colors hover:text-ink"
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      </div>

      {pathHistory.length > 0 && (
        <button
          type="button"
          onClick={navigateBack}
          className="inline-flex items-center gap-1 text-[12.5px] text-ink-mute transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('portal.documents.back')}
        </button>
      )}

      <div className="overflow-hidden rounded-lg border border-line">
        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-ink-mute" />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Folder className="mb-2 h-9 w-9 text-ink-mute" strokeWidth={1.5} />
            <p className="text-[13px] text-ink-mute">{t('portal.documents.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {documents.map((doc) => {
              const FileIcon = doc.is_folder ? Folder : getFileIcon(doc.file_extension);
              return (
                <div
                  key={doc.id}
                  role={doc.is_folder ? 'button' : undefined}
                  tabIndex={doc.is_folder ? 0 : undefined}
                  className={cn(
                    'flex min-w-0 items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-bg-alt',
                    doc.is_folder && 'cursor-pointer',
                  )}
                  onClick={() => {
                    if (doc.is_folder) {
                      const targetPath =
                        currentPath === '/' ? `/${doc.name}` : `${currentPath}/${doc.name}`;
                      navigateToFolder(targetPath);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (doc.is_folder && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      const targetPath =
                        currentPath === '/' ? `/${doc.name}` : `${currentPath}/${doc.name}`;
                      navigateToFolder(targetPath);
                    }
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-control border',
                        doc.is_folder
                          ? 'border-warn/30 bg-warn/10 text-warn'
                          : 'border-brand/30 bg-brand/[0.08] text-brand',
                      )}
                    >
                      <FileIcon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[14px] font-medium leading-tight text-ink">
                        {doc.name}
                      </p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 font-mono text-[11px] text-ink-mute">
                        {!doc.is_folder && doc.size_bytes && (
                          <span className="shrink-0">{formatFileSize(doc.size_bytes)}</span>
                        )}
                        {doc.sharepoint_modified_at && (
                          <span className="shrink-0">
                            {formatDistanceToNow(new Date(doc.sharepoint_modified_at), {
                              addSuffix: true,
                              locale,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!doc.is_folder && doc.web_url && (
                      <a
                        href={doc.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t('portal.documents.open')}
                        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-mute transition-colors hover:text-brand"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {doc.is_folder && <ChevronRight className="h-4 w-4 text-ink-mute" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
