import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
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
  Upload,
  FolderPlus,
  Sparkles,
  MoreVertical,
  FolderInput,
  Search,
} from 'lucide-react';
import {
  useSharePointConfig,
  useSharePointDocuments,
  useSharePointFolders,
  useSharePointFilePaths,
  useUploadToSharePoint,
  useCreateSharePointFolder,
  useMoveSharePointItem,
  useClassifyDocument,
  type SharePointDocument,
} from '@/hooks/useSharePoint';
import { useProvisionSharePoint } from '@/hooks/useProvisionSharePoint';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const NEW_FOLDER = '__new__';

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

/** Separa o nome base e a extensão (com ponto) de um nome de ficheiro. */
function splitName(fileName: string): { base: string; ext: string } {
  const i = fileName.lastIndexOf('.');
  if (i <= 0) return { base: fileName, ext: '' };
  return { base: fileName.slice(0, i), ext: fileName.slice(i) };
}

/**
 * Browser de documentos do cliente. Lê os documentos do SharePoint já
 * sincronizados (sharepoint_documents), scopados à organização via RLS.
 *
 * - Auto-provisão: se a org ainda não tiver pastas, são criadas no primeiro acesso.
 * - Criar/nomear pastas, upload com nome + pasta (e classificação por IA) e mover.
 */
export function PortalDocumentsBrowser() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentOrganization } = useOrganizations();
  const orgId = currentOrganization?.id;
  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig();
  const { data: documents, isLoading: isLoadingDocs } = useSharePointDocuments(currentPath);
  const { data: folders = [] } = useSharePointFolders();
  const { data: filePaths = [] } = useSharePointFilePaths();
  const { provision } = useProvisionSharePoint();
  const uploadToSharePoint = useUploadToSharePoint();
  const createFolder = useCreateSharePointFolder();
  const moveItem = useMoveSharePointItem();
  const classify = useClassifyDocument();

  const locale = dateFnsLocale(i18n.language);
  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
    queryClient.invalidateQueries({ queryKey: ['sharepoint-folders'] });
  };

  // ── Dialog: nova pasta ──────────────────────────────────────────────────────
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // ── Dialog: upload (com classificação por IA) ───────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docBase, setDocBase] = useState('');
  const [docExt, setDocExt] = useState('');
  const [docType, setDocType] = useState('');
  const [destFolder, setDestFolder] = useState<string>('/');
  const [uploadNewFolder, setUploadNewFolder] = useState('');

  // ── Dialog: mover ───────────────────────────────────────────────────────────
  const [moveDoc, setMoveDoc] = useState<SharePointDocument | null>(null);
  const [moveDest, setMoveDest] = useState<string>('/');

  // ── Auto-provisão da pasta do cliente no primeiro acesso ────────────────────
  const provisionAttempted = useRef<string | null>(null);
  const canProvision =
    !!currentOrganization?.id && !!currentOrganization?.client_code && !!currentOrganization?.name;
  useEffect(() => {
    if (isLoadingConfig || config) return;
    if (!canProvision) return;
    if (provision.isPending) return;
    if (provisionAttempted.current === currentOrganization!.id) return;
    provisionAttempted.current = currentOrganization!.id;
    provision.mutate({
      organizationId: currentOrganization!.id,
      clientCode: currentOrganization!.client_code as string,
      clientName: currentOrganization!.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingConfig, config, canProvision, currentOrganization]);

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

  // ── Ações ───────────────────────────────────────────────────────────────────
  const submitNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !orgId) return;
    const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    await createFolder.mutateAsync({ organization_id: orgId, folder_path: path });
    refresh();
    setNewFolderName('');
    setNewFolderOpen(false);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const { base, ext } = splitName(file.name);
    setPendingFile(file);
    setDocBase(base);
    setDocExt(ext);
    setDocType('');
    setDestFolder(currentPath);
    setUploadNewFolder('');
    setUploadOpen(true);
  };

  const runClassification = async () => {
    if (!pendingFile) return;
    try {
      const s = await classify.mutateAsync({ file: pendingFile, existingFolders: folders });
      if (s.suggested_name) setDocBase(s.suggested_name);
      setDocType(s.doc_type || '');
      if (s.suggested_folder) {
        if (!s.is_new_folder && folders.includes(s.suggested_folder)) {
          setDestFolder(s.suggested_folder);
        } else {
          setDestFolder(NEW_FOLDER);
          setUploadNewFolder(s.suggested_folder.replace(/^\/+/, ''));
        }
      }
    } catch {
      /* erro já tratado pelo hook de UI; mantém os valores atuais */
    }
  };

  const submitUpload = async () => {
    if (!pendingFile || !orgId) return;
    const finalName = `${docBase.trim() || splitName(pendingFile.name).base}${docExt}`;

    let folderPath = destFolder;
    if (destFolder === NEW_FOLDER) {
      const fname = uploadNewFolder.trim();
      if (!fname) return;
      folderPath = `/${fname.replace(/^\/+/, '')}`;
      await createFolder.mutateAsync({ organization_id: orgId, folder_path: folderPath });
    }

    await uploadToSharePoint.mutateAsync({ file: pendingFile, folderPath, fileName: finalName });
    refresh();
    setUploadOpen(false);
    setPendingFile(null);
  };

  const submitMove = async () => {
    if (!moveDoc) return;
    await moveItem.mutateAsync({
      sharepoint_item_id: moveDoc.sharepoint_item_id,
      destination_path: moveDest,
    });
    refresh();
    setMoveDoc(null);
  };

  const folderLabel = (path: string) =>
    path === '/' ? t('portal.documents.root') : path.replace(/^\//, '');

  // Filtro por nome + ordenação alfabética; pastas e ficheiros em secções.
  const filteredDocs = (documents ?? []).filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const byName = (a: SharePointDocument, b: SharePointDocument) =>
    a.name.localeCompare(b.name, 'pt', { sensitivity: 'base', numeric: true });
  const folderDocs = filteredDocs.filter((d) => d.is_folder).sort(byName);
  const fileDocs = filteredDocs.filter((d) => !d.is_folder).sort(byName);

  // Nº de ficheiros dentro de uma pasta, incluindo subpastas.
  const countFilesIn = (folderFullPath: string) =>
    filePaths.filter((p) => p === folderFullPath || p.startsWith(`${folderFullPath}/`)).length;

  const renderFolderCard = (doc: SharePointDocument) => {
    const targetPath = currentPath === '/' ? `/${doc.name}` : `${currentPath}/${doc.name}`;
    const count = countFilesIn(targetPath);
    return (
      <button
        type="button"
        key={doc.id}
        onClick={() => navigateToFolder(targetPath)}
        className="group flex min-w-0 items-center gap-3 rounded-card border border-line bg-surface p-3 text-left transition-all hover:border-brand/40 hover:shadow-sm"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-warn/10 text-warn">
          <Folder className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13.5px] font-medium leading-tight text-ink">
            {doc.name}
          </p>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-mute">
            {count === 0
              ? t('portal.documents.emptyShort')
              : t('portal.documents.fileCount', { count })}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  };

  const renderFileRow = (doc: SharePointDocument) => {
    const FileIcon = getFileIcon(doc.file_extension);
    return (
      <div
        key={doc.id}
        className="flex min-w-0 items-center gap-3 px-3 py-2 transition-colors hover:bg-bg-alt/60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand/[0.08] text-brand">
          <FileIcon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{doc.name}</p>

        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          {doc.file_extension && (
            <Badge
              variant="outline"
              className="w-14 justify-center text-[10px] uppercase tracking-wide text-ink-mute"
            >
              {doc.file_extension}
            </Badge>
          )}
          <span className="w-16 text-right text-[11.5px] tabular-nums text-ink-mute">
            {formatFileSize(doc.size_bytes)}
          </span>
          {doc.sharepoint_modified_at && (
            <span className="w-28 truncate text-right text-[11.5px] text-ink-mute">
              {formatDistanceToNow(new Date(doc.sharepoint_modified_at), {
                addSuffix: true,
                locale,
              })}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {doc.web_url && (
            <a
              href={doc.web_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('portal.documents.open')}
              className="flex h-8 w-8 items-center justify-center rounded-control text-ink-mute transition-colors hover:text-brand"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('portal.documents.actions')}
                className="flex h-8 w-8 items-center justify-center rounded-control text-ink-mute transition-colors hover:text-ink"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setMoveDoc(doc);
                  setMoveDest('/');
                }}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                {t('portal.documents.move')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // ── Estados de preparação ────────────────────────────────────────────────────
  if (
    isLoadingConfig ||
    (!config && (provision.isPending || (canProvision && provisionAttempted.current)))
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-ink-mute" />
        <p className="text-[13px] text-ink-mute">{t('portal.documents.preparing')}</p>
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
      {/* Barra: breadcrumb + ações */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                setCurrentPath('/');
                setPathHistory([]);
              }}
              disabled={currentPath === '/'}
              className="rounded-control px-2 py-1 font-medium text-ink-mute transition-colors hover:text-ink disabled:text-ink"
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

        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setNewFolderOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
            {t('portal.documents.newFolder')}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t('portal.documents.upload')}
          </Button>
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

      {!isLoadingDocs && documents && documents.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('portal.documents.searchPlaceholder')}
            className="h-9 pl-8"
          />
        </div>
      )}

      {isLoadingDocs ? (
        <div className="flex items-center justify-center rounded-lg border border-line py-12">
          <Loader2 className="h-6 w-6 animate-spin text-ink-mute" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line py-12 text-center">
          <Folder className="mb-2 h-9 w-9 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.documents.empty')}</p>
          <p className="mt-1 text-[12px] text-ink-mute">{t('portal.documents.uploadHint')}</p>
        </div>
      ) : folderDocs.length === 0 && fileDocs.length === 0 ? (
        <p className="rounded-lg border border-line py-12 text-center text-[13px] text-ink-mute">
          {t('portal.documents.noResults', { query })}
        </p>
      ) : (
        <div className="space-y-5">
          {folderDocs.length > 0 && (
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                {t('portal.documents.folders')} · {folderDocs.length}
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {folderDocs.map(renderFolderCard)}
              </div>
            </section>
          )}
          {fileDocs.length > 0 && (
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                {t('portal.documents.files')} · {fileDocs.length}
              </h4>
              <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {fileDocs.map(renderFileRow)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Dialog: nova pasta ─────────────────────────────────────────────── */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('portal.documents.newFolder')}</DialogTitle>
            <DialogDescription>
              {t('portal.documents.newFolderHint', { path: folderLabel(currentPath) })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="folder-name">{t('portal.documents.folderName')}</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('portal.documents.folderNamePlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && submitNewFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={submitNewFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('portal.documents.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: upload ─────────────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('portal.documents.uploadTitle')}</DialogTitle>
            <DialogDescription>{t('portal.documents.uploadHintDialog')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pendingFile && (
              <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-bg-alt/50 px-3 py-2">
                <span className="min-w-0 truncate font-mono text-[12px] text-ink-mute">
                  {pendingFile.name}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={runClassification}
                  disabled={classify.isPending}
                >
                  {classify.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {t('portal.documents.classifyAI')}
                </Button>
              </div>
            )}

            {classify.isPending && (
              <p className="text-[12px] text-ink-mute">{t('portal.documents.classifying')}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="doc-name" className="flex items-center gap-2">
                {t('portal.documents.docName')}
                {docType && (
                  <Badge variant="outline" className="text-[10px]">
                    {docType}
                  </Badge>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="doc-name"
                  value={docBase}
                  onChange={(e) => setDocBase(e.target.value)}
                  placeholder={t('portal.documents.docNamePlaceholder')}
                />
                {docExt && (
                  <span className="shrink-0 font-mono text-[12px] text-ink-mute">{docExt}</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('portal.documents.destFolder')}</Label>
              <Select value={destFolder} onValueChange={setDestFolder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/">{t('portal.documents.root')}</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {folderLabel(f)}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_FOLDER}>＋ {t('portal.documents.newFolder')}</SelectItem>
                </SelectContent>
              </Select>
              {destFolder === NEW_FOLDER && (
                <Input
                  value={uploadNewFolder}
                  onChange={(e) => setUploadNewFolder(e.target.value)}
                  placeholder={t('portal.documents.folderNamePlaceholder')}
                  className="mt-1.5"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={submitUpload}
              disabled={
                uploadToSharePoint.isPending ||
                createFolder.isPending ||
                !docBase.trim() ||
                (destFolder === NEW_FOLDER && !uploadNewFolder.trim())
              }
            >
              {(uploadToSharePoint.isPending || createFolder.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('portal.documents.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: mover ──────────────────────────────────────────────────── */}
      <Dialog open={moveDoc !== null} onOpenChange={(v) => !v && setMoveDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('portal.documents.move')}</DialogTitle>
            <DialogDescription className="truncate">{moveDoc?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>{t('portal.documents.destFolder')}</Label>
            <Select value={moveDest} onValueChange={setMoveDest}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/">{t('portal.documents.root')}</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f} value={f}>
                    {folderLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDoc(null)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={submitMove} disabled={moveItem.isPending}>
              {moveItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('portal.documents.move')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
