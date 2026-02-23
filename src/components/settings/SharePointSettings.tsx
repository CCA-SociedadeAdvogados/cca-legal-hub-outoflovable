import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  useSharePointConfig,
  useSaveSharePointConfig,
  useSyncSharePoint,
  useSharePointSyncLogs,
  useDeleteSharePointConfig,
} from "@/hooks/useSharePoint";
import {
  Cloud,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Trash2,
  Info,
  FolderSync,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SharePointSettings() {
  const { t } = useTranslation();
  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig();
  const { data: syncLogs } = useSharePointSyncLogs(5);
  const saveConfig = useSaveSharePointConfig();
  const syncSharePoint = useSyncSharePoint();
  const deleteConfig = useDeleteSharePointConfig();

  const [siteId, setSiteId] = useState(config?.site_id || "");
  const [syncEnabled, setSyncEnabled] = useState(config?.sync_enabled ?? true);
  const [syncInterval, setSyncInterval] = useState(config?.sync_interval_minutes ?? 5);
  const [rootFolderPath, setRootFolderPath] = useState(config?.root_folder_path || "/");

  // Update local state when config loads
  useState(() => {
    if (config) {
      setSiteId(config.site_id);
      setSyncEnabled(config.sync_enabled);
      setSyncInterval(config.sync_interval_minutes);
      setRootFolderPath(config.root_folder_path || "/");
    }
  });

  const handleSave = () => {
    if (!siteId.trim()) {
      return;
    }
    saveConfig.mutate({
      site_id: siteId.trim(),
      sync_enabled: syncEnabled,
      sync_interval_minutes: syncInterval,
      root_folder_path: rootFolderPath.trim() || "/",
    });
  };

  const handleSync = (forceFull: boolean = false) => {
    syncSharePoint.mutate({ force_full_sync: forceFull });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("sharepoint.status.success", "Sincronizado")}
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t("sharepoint.status.error", "Erro")}
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {t("sharepoint.status.syncing", "A sincronizar...")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            {t("sharepoint.status.pending", "Pendente")}
          </Badge>
        );
    }
  };

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("sharepoint.info.title", "Integração SharePoint")}</AlertTitle>
        <AlertDescription>
          {t(
            "sharepoint.info.description",
            "Sincronize documentos do SharePoint automaticamente com a plataforma. Consulte o guia de configuração para instruções detalhadas."
          )}
          <Button variant="link" className="h-auto p-0 ml-1" asChild>
            <a href="/docs/SHAREPOINT_SETUP_GUIDE.md" target="_blank">
              {t("sharepoint.info.viewGuide", "Ver guia")}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {t("sharepoint.config.title", "Configuração SharePoint")}
          </CardTitle>
          <CardDescription>
            {t("sharepoint.config.description", "Configure a ligação ao seu site SharePoint.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Site ID Input */}
          <div className="space-y-2">
            <Label htmlFor="siteId">{t("sharepoint.config.siteId", "Site ID")}</Label>
            <Input
              id="siteId"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              placeholder="empresa.sharepoint.com,guid1,guid2"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "sharepoint.config.siteIdHelp",
                "Obtenha o Site ID através do Microsoft Graph Explorer. Formato: hostname,site-guid,web-guid"
              )}
            </p>
          </div>

          {/* Root Folder Path */}
          <div className="space-y-2">
            <Label htmlFor="rootFolderPath">
              {t("sharepoint.config.rootFolderPath", "Pasta Raiz")}
            </Label>
            <Input
              id="rootFolderPath"
              value={rootFolderPath}
              onChange={(e) => setRootFolderPath(e.target.value)}
              placeholder="/Clientes/Cliente_A"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "sharepoint.config.rootFolderPathHelp",
                "Caminho da pasta no SharePoint que esta organização pode ver. Ex: /Clientes/Cliente_A. Deixe / para ver tudo."
              )}
            </p>
          </div>

          {/* Connected Site Info */}
          {config?.site_name && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">{t("sharepoint.config.connected", "Ligado a:")}</span>
                <span>{config.site_name}</span>
              </div>
              {config.site_url && (
                <a
                  href={config.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {config.site_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <Separator />

          {/* Sync Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t("sharepoint.sync.title", "Sincronização")}</h4>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{t("sharepoint.sync.enabled", "Sincronização automática")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("sharepoint.sync.enabledDesc", "Verificar novos documentos periodicamente")}
                </p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncInterval">
                {t("sharepoint.sync.interval", "Intervalo de sincronização")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="syncInterval"
                  type="number"
                  min="1"
                  max="60"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value) || 5)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {t("sharepoint.sync.minutes", "minutos")}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saveConfig.isPending || !siteId.trim()}>
            {saveConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("sharepoint.config.save", "Guardar Configuração")}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Status Card */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderSync className="h-5 w-5" />
              {t("sharepoint.syncStatus.title", "Estado da Sincronização")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("sharepoint.syncStatus.status", "Estado:")}</span>
                  {getStatusBadge(config.last_sync_status)}
                </div>
                {config.last_sync_at && (
                  <p className="text-sm text-muted-foreground">
                    {t("sharepoint.syncStatus.lastSync", "Última sincronização:")}{" "}
                    {formatDistanceToNow(new Date(config.last_sync_at), {
                      addSuffix: true,
                      locale: pt,
                    })}
                  </p>
                )}
                {config.last_sync_error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {config.last_sync_error}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(false)}
                  disabled={syncSharePoint.isPending}
                >
                  {syncSharePoint.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t("sharepoint.syncStatus.syncNow", "Sincronizar")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSync(true)}
                  disabled={syncSharePoint.isPending}
                >
                  {t("sharepoint.syncStatus.fullSync", "Sincronização completa")}
                </Button>
              </div>
            </div>

            {/* Recent Sync Logs */}
            {syncLogs && syncLogs.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">
                  {t("sharepoint.syncStatus.recentLogs", "Histórico recente")}
                </h5>
                <div className="space-y-2">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded border p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {log.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : log.status === "error" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.started_at), {
                            addSuffix: true,
                            locale: pt,
                          })}
                        </span>
                      </div>
                      {log.status === "success" && (
                        <span className="text-muted-foreground">
                          +{log.items_added} / ~{log.items_updated} / -{log.items_deleted}
                        </span>
                      )}
                      {log.status === "error" && log.error_message && (
                        <span className="text-destructive text-xs truncate max-w-[200px]">
                          {log.error_message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {config && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("sharepoint.danger.title", "Zona de Perigo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {t("sharepoint.danger.remove", "Remover integração SharePoint")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "sharepoint.danger.removeDesc",
                    "Remove a configuração e todos os documentos sincronizados da base de dados."
                  )}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("sharepoint.danger.removeButton", "Remover")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("sharepoint.danger.confirmTitle", "Tem a certeza?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "sharepoint.danger.confirmDesc",
                        "Esta ação irá remover a configuração do SharePoint e todos os documentos sincronizados. Os ficheiros no SharePoint não serão afetados."
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel", "Cancelar")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteConfig.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("sharepoint.danger.confirmButton", "Sim, remover")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
