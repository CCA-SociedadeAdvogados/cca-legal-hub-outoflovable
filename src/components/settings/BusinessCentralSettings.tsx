import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Info,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import {
  useBusinessCentralSyncStatus,
  useSaveBusinessCentralConfig,
  useDeleteBusinessCentralConfig,
} from "@/hooks/useBusinessCentral";

export function BusinessCentralSettings() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? pt : enUS;

  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useBusinessCentralSyncStatus();
  const saveConfig = useSaveBusinessCentralConfig();
  const deleteConfig = useDeleteBusinessCentralConfig();

  const config = syncStatus?.config ?? null;

  const [bcUrl, setBcUrl] = useState("");
  const [companyGuid, setCompanyGuid] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);

  // Load existing config
  useEffect(() => {
    if (config) {
      setBcUrl(config.bc_url || "");
      setCompanyGuid(config.company_guid || "");
      setCompanyName(config.company_name || "");
      setIsEnabled(config.is_enabled);
      setSyncInterval(config.sync_interval_minutes);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate({
      bc_url: bcUrl,
      company_guid: companyGuid,
      company_name: companyName || undefined,
      is_enabled: isEnabled,
      sync_interval_minutes: syncInterval,
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("businessCentral.status.synced", "Sincronizado")}
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t("businessCentral.status.error", "Erro")}
          </Badge>
        );
      case "running":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {t("businessCentral.status.syncing", "A sincronizar...")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            {t("businessCentral.status.pending", "Pendente")}
          </Badge>
        );
    }
  };

  if (isLoadingSyncStatus) {
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
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("businessCentral.settings.infoTitle", "Integração Business Central")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {t(
              "businessCentral.settings.infoDesc",
              "A API do Business Central está na rede interna da empresa e não é diretamente acessível pela cloud. É necessário instalar e executar o agente de sincronização local na rede da empresa."
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              "businessCentral.settings.agentDesc",
              "O agente local lê os dados do BC (customers, Account, arq_ledger) e sincroniza para esta plataforma via chave de serviço Supabase. Pode ser agendado a qualquer intervalo."
            )}
          </p>
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("businessCentral.settings.configTitle", "Configuração Business Central")}
          </CardTitle>
          <CardDescription>
            {t("businessCentral.settings.configDesc", "Defina o URL do servidor BC e o GUID da empresa para esta organização.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* BC URL */}
          <div className="space-y-2">
            <Label htmlFor="bcUrl">{t("businessCentral.settings.bcUrl", "URL do Servidor BC")}</Label>
            <Input
              id="bcUrl"
              value={bcUrl}
              onChange={(e) => setBcUrl(e.target.value)}
              placeholder="http://servidor:2053/BC140WS"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "businessCentral.settings.bcUrlHelp",
                "URL base do servidor Business Central on-premises. Ex: http://10.110.250.30:2053/BC140WS"
              )}
            </p>
          </div>

          {/* Company GUID */}
          <div className="space-y-2">
            <Label htmlFor="companyGuid">{t("businessCentral.settings.companyGuid", "GUID da Empresa")}</Label>
            <Input
              id="companyGuid"
              value={companyGuid}
              onChange={(e) => setCompanyGuid(e.target.value)}
              placeholder="a19b2029-4c6b-411e-9265-224d70785270"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "businessCentral.settings.companyGuidHelp",
                "GUID único da empresa no BC. Encontre-o no URL da API: /companies({GUID})"
              )}
            </p>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">{t("businessCentral.settings.companyName", "Nome da Empresa (opcional)")}</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Empresa, Lda."
            />
          </div>

          {/* Connected Status */}
          {config?.company_name && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">{t("businessCentral.settings.connected", "Ligado a:")}</span>
                <span>{config.company_name}</span>
              </div>
              {config.last_sync_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("businessCentral.settings.lastSync", "Última sincronização:")}{" "}
                  {formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true, locale: dateLocale })}
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>{t("businessCentral.settings.enabled", "Integração ativa")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("businessCentral.settings.enabledDesc", "Ativar ou desativar a visualização dos dados BC nesta organização")}
              </p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending || !bcUrl.trim() || !companyGuid.trim()}
          >
            {saveConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("businessCentral.settings.save", "Guardar Configuração")}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Status Card */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("businessCentral.settings.syncTitle", "Estado da Sincronização")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status + Counts */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t("businessCentral.settings.syncStatus", "Estado:")}</span>
                    {getStatusBadge(config.last_sync_status)}
                  </div>
                  {config.last_sync_at && (
                    <p className="text-sm text-muted-foreground">
                      {t("businessCentral.settings.lastSync", "Última sincronização:")}{" "}
                      {formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  )}
                  {config.last_sync_error && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {config.last_sync_error}
                    </p>
                  )}
                </div>
              </div>

              {/* Data counts */}
              {syncStatus?.counts && (
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{syncStatus.counts.customers}</p>
                    <p className="text-xs text-muted-foreground">{t("businessCentral.settings.customers", "Clientes")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{syncStatus.counts.accounts}</p>
                    <p className="text-xs text-muted-foreground">{t("businessCentral.settings.accounts", "Contas")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{syncStatus.counts.ledger_entries}</p>
                    <p className="text-xs text-muted-foreground">{t("businessCentral.settings.ledgerEntries", "Lançamentos")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Agent Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("businessCentral.settings.agentTitle", "Agente de sincronização local")}</AlertTitle>
              <AlertDescription>
                <p className="text-sm">
                  {t(
                    "businessCentral.settings.agentInstructions",
                    "Para sincronizar dados, execute o agente local na rede interna da empresa:"
                  )}
                </p>
                <pre className="mt-2 text-xs bg-muted rounded p-2 overflow-x-auto">
                  {`cd scripts/bc-sync-agent\nnpm install\nnode sync.js`}
                </pre>
              </AlertDescription>
            </Alert>

            {/* Recent Logs */}
            {syncStatus?.logs && syncStatus.logs.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">{t("businessCentral.settings.recentLogs", "Histórico recente")}</h5>
                <div className="space-y-2">
                  {syncStatus.logs.map((log) => (
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
                          {formatDistanceToNow(new Date(log.started_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {log.status === "success" && (
                          <span>
                            {log.customers_synced} clientes · {log.accounts_synced} contas · {log.ledger_entries_synced} lançamentos
                          </span>
                        )}
                        {log.status === "error" && log.error_message && (
                          <span className="text-destructive truncate max-w-[200px] block">{log.error_message}</span>
                        )}
                      </div>
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
              {t("businessCentral.settings.dangerTitle", "Zona de Perigo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {t("businessCentral.settings.removeIntegration", "Remover integração Business Central")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "businessCentral.settings.removeDesc",
                    "Remove a configuração e todos os dados sincronizados (clientes, contas e lançamentos)."
                  )}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("businessCentral.settings.removeButton", "Remover")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("businessCentral.settings.confirmTitle", "Tem a certeza?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "businessCentral.settings.confirmDesc",
                        "Esta ação irá remover a configuração do Business Central e todos os dados sincronizados (clientes, contas e lançamentos). Os dados no Business Central não serão afetados."
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel", "Cancelar")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteConfig.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("businessCentral.settings.confirmButton", "Sim, remover")}
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
