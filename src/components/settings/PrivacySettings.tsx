import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Shield, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
} from "lucide-react";
import { useUserConsents, useDSARRequests, CONSENT_TYPES } from "@/hooks/useUserConsents";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function PrivacySettings() {
  const { t } = useTranslation();
  const { consents, isLoading: isLoadingConsents, updateConsent, getConsentStatus } = useUserConsents();
  const { 
    requests, 
    isLoading: isLoadingRequests, 
    hasPendingDeletion, 
    pendingDeletionRequest,
    requestDataExport, 
    requestAccountDeletion,
    cancelDeletionRequest,
  } = useDSARRequests();

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleConsentChange = async (consentType: string, granted: boolean) => {
    await updateConsent.mutateAsync({ consentType, granted });
  };

  const handleExportData = async () => {
    await requestDataExport.mutateAsync();
  };

  const handleRequestDeletion = async () => {
    if (!deletePassword) return;
    await requestAccountDeletion.mutateAsync({ 
      password: deletePassword, 
      reason: deleteReason || undefined 
    });
    setDeletePassword("");
    setDeleteReason("");
    setShowDeleteDialog(false);
  };

  const handleCancelDeletion = async () => {
    if (pendingDeletionRequest) {
      await cancelDeletionRequest.mutateAsync(pendingDeletionRequest.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case "processing":
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Loader2 className="mr-1 h-3 w-3 animate-spin" />A processar</Badge>;
      case "completed":
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle className="mr-1 h-3 w-3" />Concluído</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="mr-1 h-3 w-3" />Falhado</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* GDPR Rights Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("privacy.title", "Privacidade e Proteção de Dados")}
          </CardTitle>
          <CardDescription>
            {t("privacy.description", "Gerir os seus dados pessoais de acordo com o RGPD.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("privacy.gdprInfo", "De acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD), tem direito a:")}
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t("privacy.rights.access", "Aceder aos seus dados pessoais (Artigo 15)")}</li>
              <li>{t("privacy.rights.rectification", "Retificar dados incorretos (Artigo 16)")}</li>
              <li>{t("privacy.rights.erasure", "Solicitar a eliminação dos seus dados (Artigo 17)")}</li>
              <li>{t("privacy.rights.portability", "Portabilidade dos dados (Artigo 20)")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t("privacy.consents.title", "Gestão de Consentimentos")}
          </CardTitle>
          <CardDescription>
            {t("privacy.consents.description", "Controle quais tratamentos de dados autoriza.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingConsents ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            CONSENT_TYPES.map((consent) => (
              <div
                key={consent.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>{t(consent.labelKey, consent.id)}</Label>
                    {consent.required && (
                      <Badge variant="secondary" className="text-xs">
                        {t("privacy.consents.required", "Obrigatório")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`${consent.labelKey}Desc`, "")}
                  </p>
                </div>
                <Switch
                  checked={getConsentStatus(consent.id)}
                  onCheckedChange={(checked) => handleConsentChange(consent.id, checked)}
                  disabled={consent.required || updateConsent.isPending}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("privacy.export.title", "Exportar os Meus Dados")}
          </CardTitle>
          <CardDescription>
            {t("privacy.export.description", "Descarregue uma cópia de todos os seus dados pessoais em formato JSON.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t("privacy.export.info", "O ficheiro incluirá: perfil, membros de organizações, histórico de atividade, notificações, e contratos criados.")}
            </p>
          </div>
          <Button 
            onClick={handleExportData} 
            disabled={requestDataExport.isPending}
            className="gap-2"
          >
            {requestDataExport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("privacy.export.button", "Exportar Dados")}
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("privacy.deletion.title", "Eliminar Conta")}
          </CardTitle>
          <CardDescription>
            {t("privacy.deletion.description", "Solicitar a eliminação permanente da sua conta e dados.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPendingDeletion && pendingDeletionRequest ? (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t("privacy.deletion.pending", "Pedido de eliminação pendente")}
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t("privacy.deletion.scheduledFor", "A sua conta será eliminada em: ")}
                <strong>
                  {pendingDeletionRequest.scheduled_execution_at 
                    ? format(new Date(pendingDeletionRequest.scheduled_execution_at), "PPP", { locale: pt })
                    : "N/A"}
                </strong>
              </p>
              <Button 
                variant="outline" 
                onClick={handleCancelDeletion}
                disabled={cancelDeletionRequest.isPending}
              >
                {cancelDeletionRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("privacy.deletion.cancel", "Cancelar Pedido")}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {t("privacy.deletion.warning", "Atenção: Esta ação é irreversível!")}
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>{t("privacy.deletion.warningItem1", "Todos os seus dados pessoais serão eliminados ou anonimizados")}</li>
                  <li>{t("privacy.deletion.warningItem2", "Perderá acesso a todas as organizações")}</li>
                  <li>{t("privacy.deletion.warningItem3", "Tem 7 dias para cancelar o pedido")}</li>
                </ul>
              </div>
              
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    {t("privacy.deletion.button", "Solicitar Eliminação")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("privacy.deletion.confirmTitle", "Confirmar Eliminação de Conta")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        {t("privacy.deletion.confirmDesc", "Para confirmar, introduza a sua palavra-passe. A eliminação será agendada para daqui a 7 dias.")}
                      </p>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="delete-password">Palavra-passe *</Label>
                          <Input
                            id="delete-password"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="delete-reason">Motivo (opcional)</Label>
                          <Textarea
                            id="delete-reason"
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Ajude-nos a melhorar..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRequestDeletion}
                      disabled={!deletePassword || requestAccountDeletion.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {requestAccountDeletion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar Eliminação
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("privacy.history.title", "Histórico de Pedidos")}
          </CardTitle>
          <CardDescription>
            {t("privacy.history.description", "Registo dos seus pedidos de acesso e eliminação de dados.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("privacy.history.empty", "Nenhum pedido registado.")}
            </p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {request.request_type === "export" ? "Exportação" : 
                         request.request_type === "deletion" ? "Eliminação" : 
                         request.request_type}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), "PPp", { locale: pt })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
