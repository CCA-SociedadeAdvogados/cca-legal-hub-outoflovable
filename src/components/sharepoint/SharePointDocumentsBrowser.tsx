import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useSharePointDocuments,
  useSharePointConfig,
  useSyncSharePoint,
  useUploadToSharePoint,
} from "@/hooks/useSharePoint";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SharePointDocumentsBrowserProps {
  onSelectDocument?: (document: any) => void;
  className?: string;
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
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SharePointDocumentsBrowser({
  onSelectDocument,
  className,
}: SharePointDocumentsBrowserProps) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig();
  const { data: documents, isLoading: isLoadingDocs, refetch } = useSharePointDocuments(currentPath);
  const syncSharePoint = useSyncSharePoint();
  const uploadToSharePoint = useUploadToSharePoint();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSync = () => {
    syncSharePoint.mutate({});
  };

  const handleFullSync = () => {
    syncSharePoint.mutate({ force_full_sync: true });
  };

  const handleOpenInSharePoint = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Build breadcrumb path
  const breadcrumbParts = currentPath.split("/").filter(Boolean);

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
          <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">
            {t("sharepoint.browser.notConfigured", "SharePoint não configurado")}
          </h3>
          <p className="text-muted-foreground text-sm mt-2">
            {t(
              "sharepoint.browser.notConfiguredDesc",
              "Configure a integração SharePoint nas Definições para sincronizar documentos."
            )}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/definicoes?tab=sharepoint">
              {t("sharepoint.browser.goToSettings", "Ir para Definições")}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-5 w-5" />
              {t("sharepoint.browser.title", "Arquivo SharePoint")}
              {config.site_name && (
                <Badge variant="secondary" className="font-normal">
                  {config.site_name}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("sharepoint.browser.archiveHint", "Guarde aqui os documentos ativos para manter tudo organizado e acessível.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {config.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                {t("sharepoint.browser.lastSync", "Última sync:")}{" "}
                {formatDistanceToNow(new Date(config.last_sync_at), {
                  addSuffix: true,
                  locale: pt,
                })}
              </span>
            )}
            {currentPath !== "/" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                disabled={uploadToSharePoint.isPending}
              >
                {uploadToSharePoint.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {t("sharepoint.browser.upload", "Carregar")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullSync}
              disabled={syncSharePoint.isPending}
              title={t("sharepoint.browser.fullSync", "Sincronização completa")}
            >
              {syncSharePoint.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t("sharepoint.browser.fullSync", "Sync completa")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 text-sm mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => {
              setCurrentPath("/");
              setPathHistory([]);
            }}
            disabled={currentPath === "/"}
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            {t("sharepoint.browser.root", "Raiz")}
          </Button>
          {breadcrumbParts.map((part, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  const newPath = "/" + breadcrumbParts.slice(0, index + 1).join("/");
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
      </CardHeader>

      <CardContent>
        {/* Back button */}
        {pathHistory.length > 0 && (
          <Button variant="ghost" size="sm" className="mb-2" onClick={navigateBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("sharepoint.browser.back", "Voltar")}
          </Button>
        )}

        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {t("sharepoint.browser.empty", "Nenhum documento nesta pasta")}
            </p>
            {config.last_sync_status === "error" && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {config.last_sync_error}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => {
              const FileIcon = doc.is_folder ? Folder : getFileIcon(doc.file_extension);

              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-lg transition-colors",
                    doc.is_folder && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (doc.is_folder) {
                      const targetPath = currentPath === "/" ? `/${doc.name}` : `${currentPath}/${doc.name}`;
                      navigateToFolder(targetPath);
                    } else if (onSelectDocument) {
                      onSelectDocument(doc);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        doc.is_folder ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                      )}
                    >
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!doc.is_folder && doc.size_bytes && (
                          <span>{formatFileSize(doc.size_bytes)}</span>
                        )}
                        {doc.sharepoint_modified_at && (
                          <span>
                            {formatDistanceToNow(new Date(doc.sharepoint_modified_at), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                        )}
                        {doc.sharepoint_modified_by && (
                          <span className="truncate max-w-[150px]">{doc.sharepoint_modified_by}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.web_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInSharePoint(doc.web_url!);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {doc.is_folder && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("sharepoint.upload.title", "Carregar ficheiro para SharePoint")}
            </DialogTitle>
            <DialogDescription>
              {t("sharepoint.upload.description", "O ficheiro será carregado para a pasta: {{path}}", {
                path: currentPath === "/" ? t("sharepoint.browser.root", "Raiz") : currentPath,
              })}
              {" · "}
              {t("sharepoint.upload.sizeLimit", "Limite: 4MB")}
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
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("sharepoint.upload.dropzone", "Clique para selecionar um ficheiro")}
                  </p>
                </div>
              )}
            </div>

            {selectedFile && selectedFile.size > 4 * 1024 * 1024 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {t("sharepoint.upload.tooLarge", "Ficheiro demasiado grande. Limite: 4MB")}
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
              {t("common.cancel", "Cancelar")}
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
                  }
                );
              }}
              disabled={!selectedFile || selectedFile.size > 4 * 1024 * 1024 || uploadToSharePoint.isPending}
            >
              {uploadToSharePoint.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {t("sharepoint.upload.submit", "Carregar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
