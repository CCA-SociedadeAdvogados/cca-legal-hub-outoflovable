/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/click-events-have-key-events */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSharePointDocuments,
  useSharePointConfig,
  useSyncSharePoint,
  useUploadToSharePoint,
} from '@/hooks/useSharePoint';
import {
  Folder,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ExternalLink,
  Loader2,
  Cloud,
  FolderOpen,
  AlertCircle,
  Upload,
  Search,
  ArrowDownAZ,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SharePointDocumentsBrowserProps {
  onSelectDocument?: (document: any) => void;
  className?: string;
  overrideOrgId?: string;
  initialPath?: string;
}

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

export function SharePointDocumentsBrowser({
  onSelectDocument,
  className,
  overrideOrgId,
  initialPath,
}: SharePointDocumentsBrowserProps) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState(initialPath ?? '/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig(overrideOrgId);
  const { data: documents, isLoading: isLoadingDocs } = useSharePointDocuments(
    currentPath,
    overrideOrgId,
  );
  const syncSharePoint = useSyncSharePoint(overrideOrgId);
  const uploadToSharePoint = useUploadToSharePoint();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'modified'>('name');

  const navigateToFolder = (folderPath: string) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const newHistory = [...pathHistory];
      const previousPath = newHistory.pop()!;
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
    }
  };

  const handleFullSync = () => {
    syncSharePoint.mutate({ force_full_sync: true });
  };

  const handleOpenInSharePoint = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  // Filtro por nome + ordenação; pastas e ficheiros são separados em secções.
  const filteredDocs = (documents ?? []).filter((d: any) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const sortDocs = (a: any, b: any) =>
    sortBy === 'name'
      ? a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
      : new Date(b.sharepoint_modified_at ?? 0).getTime() -
        new Date(a.sharepoint_modified_at ?? 0).getTime();
  const folders = filteredDocs.filter((d: any) => d.is_folder).sort(sortDocs);
  const files = filteredDocs.filter((d: any) => !d.is_folder).sort(sortDocs);

  const renderRow = (doc: any) => {
    const FileIcon = doc.is_folder ? Folder : getFileIcon(doc.file_extension);
    return (
      <div
        key={doc.id}
        className={cn(
          'flex min-w-0 items-center justify-between gap-3 rounded-control px-3 py-2 transition-colors hover:bg-bg-alt',
          doc.is_folder && 'cursor-pointer',
        )}
        onClick={() => {
          if (doc.is_folder) {
            const targetPath = currentPath === '/' ? `/${doc.name}` : `${currentPath}/${doc.name}`;
            navigateToFolder(targetPath);
          } else if (onSelectDocument) {
            onSelectDocument(doc);
          }
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-control border',
              doc.is_folder
                ? 'border-warn/30 bg-warn/10 text-warn'
                : 'border-brand/30 bg-brand/[0.08] text-brand',
            )}
          >
            <FileIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />
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
                    locale: pt,
                  })}
                </span>
              )}
              {doc.sharepoint_modified_by && (
                <span className="max-w-[150px] truncate">{doc.sharepoint_modified_by}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {doc.web_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-ink-mute hover:text-brand"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInSharePoint(doc.web_url!);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {doc.is_folder && <ChevronRight className="h-4 w-4 text-ink-mute" />}
        </div>
      </div>
    );
  };

  if (isLoadingConfig) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Cloud className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">
            {t('sharepoint.browser.notConfigured', 'SharePoint não configurado')}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              'sharepoint.browser.notConfiguredDesc',
              'Configure a integração SharePoint nas Definições para sincronizar documentos.',
            )}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/definicoes?tab=sharepoint">
              {t('sharepoint.browser.goToSettings', 'Ir para Definições')}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('min-w-0 overflow-hidden', className)}>
      <CardHeader className="min-w-0 pb-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
              <Cloud className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {t('sharepoint.browser.title', 'Arquivo SharePoint')}
              </span>
              {config.site_name && (
                <Badge variant="secondary" className="max-w-full font-normal">
                  <span className="truncate">{config.site_name}</span>
                </Badge>
              )}
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                'sharepoint.browser.archiveHint',
                'Guarde aqui os documentos ativos para manter tudo organizado e acessível.',
              )}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {config.last_sync_at && (
              <span className="truncate text-xs text-muted-foreground">
                {t('sharepoint.browser.lastSync', 'Última sync:')}{' '}
                {formatDistanceToNow(new Date(config.last_sync_at), {
                  addSuffix: true,
                  locale: pt,
                })}
              </span>
            )}

            {currentPath !== '/' && (
              <Button
                variant="default"
                size="sm"
                className="shrink-0"
                onClick={() => setShowUploadDialog(true)}
                disabled={uploadToSharePoint.isPending}
              >
                {uploadToSharePoint.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                {t('sharepoint.browser.upload', 'Carregar')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleFullSync}
              disabled={syncSharePoint.isPending}
              title={t('sharepoint.browser.fullSync', 'Sincronização completa')}
            >
              {syncSharePoint.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  {t('sharepoint.browser.fullSync', 'Sync completa')}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <div className="mt-2 flex min-w-max items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-2"
              onClick={() => {
                setCurrentPath('/');
                setPathHistory([]);
              }}
              disabled={currentPath === '/'}
            >
              <FolderOpen className="mr-1 h-4 w-4" />
              {t('sharepoint.browser.root', 'Raiz')}
            </Button>

            {breadcrumbParts.map((part, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2"
                  onClick={() => {
                    const newPath = '/' + breadcrumbParts.slice(0, index + 1).join('/');
                    if (newPath !== currentPath) {
                      setPathHistory([...pathHistory, currentPath]);
                      setCurrentPath(newPath);
                    }
                  }}
                >
                  {part}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {pathHistory.length > 0 && (
          <Button variant="ghost" size="sm" className="mb-2 shrink-0" onClick={navigateBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('sharepoint.browser.back', 'Voltar')}
          </Button>
        )}

        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="mb-2 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t('sharepoint.browser.empty', 'Nenhum documento nesta pasta')}
            </p>
            {config.last_sync_status === 'error' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {config.last_sync_error}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Toolbar: pesquisa + ordenação */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('sharepoint.browser.search', 'Pesquisar nesta pasta…')}
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-control border p-0.5">
                <Button
                  variant={sortBy === 'name' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSortBy('name')}
                >
                  <ArrowDownAZ className="mr-1 h-4 w-4" />
                  {t('sharepoint.browser.sortName', 'Nome')}
                </Button>
                <Button
                  variant={sortBy === 'modified' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSortBy('modified')}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  {t('sharepoint.browser.sortModified', 'Recentes')}
                </Button>
              </div>
            </div>

            {folders.length === 0 && files.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-mute">
                {t('sharepoint.browser.noResults', 'Sem resultados para “{{query}}”.', { query })}
              </p>
            ) : (
              <div className="space-y-4">
                {folders.length > 0 && (
                  <section>
                    <h4 className="mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                      {t('sharepoint.browser.folders', 'Pastas')}
                      <span className="font-mono">{folders.length}</span>
                    </h4>
                    <div className="divide-y">{folders.map(renderRow)}</div>
                  </section>
                )}
                {files.length > 0 && (
                  <section>
                    <h4 className="mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                      {t('sharepoint.browser.files', 'Ficheiros')}
                      <span className="font-mono">{files.length}</span>
                    </h4>
                    <div className="divide-y">{files.map(renderRow)}</div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('sharepoint.upload.title', 'Carregar ficheiro para SharePoint')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'sharepoint.upload.description',
                'O ficheiro será carregado para a pasta: {{path}}',
                {
                  path: currentPath === '/' ? t('sharepoint.browser.root', 'Raiz') : currentPath,
                },
              )}
              {' · '}
              {t('sharepoint.upload.sizeLimit', 'Limite: 4MB')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />

            <div
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t('sharepoint.upload.dropzone', 'Clique para selecionar um ficheiro')}
                  </p>
                </div>
              )}
            </div>

            {selectedFile && selectedFile.size > 4 * 1024 * 1024 && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {t('sharepoint.upload.tooLarge', 'Ficheiro demasiado grande. Limite: 4MB')}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>

            <Button
              onClick={() => {
                if (!selectedFile) return;
                uploadToSharePoint.mutate(
                  { file: selectedFile, folderPath: currentPath },
                  {
                    onSuccess: () => {
                      setShowUploadDialog(false);
                      setSelectedFile(null);
                    },
                  },
                );
              }}
              disabled={
                !selectedFile || selectedFile.size > 4 * 1024 * 1024 || uploadToSharePoint.isPending
              }
            >
              {uploadToSharePoint.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              {t('sharepoint.upload.submit', 'Carregar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
