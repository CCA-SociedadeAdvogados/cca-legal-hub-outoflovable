import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Smartphone, 
  Key, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  QrCode,
  Copy,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SecuritySettings() {
  const { t } = useTranslation();
  const { profile, isLoading: isLoadingProfile, updateProfile } = useProfile();
  
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const is2FAEnabled = profile?.two_factor_enabled ?? false;

  const handleEnable2FA = async () => {
    setIsEnabling2FA(true);
    try {
      // Enroll in MFA
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      if (data?.totp) {
        setTotpSecret(data.totp.secret);
        setTotpUri(data.totp.uri);
        setShow2FADialog(true);
      }
    } catch (error: any) {
      console.error("Error enabling 2FA:", error);
      toast.error(error.message || "Erro ao ativar autenticação de dois fatores.");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Por favor, introduza um código de 6 dígitos.");
      return;
    }

    setIsVerifying(true);
    try {
      // Get the current factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        throw new Error("TOTP factor not found");
      }

      // Create a challenge and verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      // Update profile to reflect 2FA is enabled
      await updateProfile.mutateAsync({
        two_factor_enabled: true,
        two_factor_verified_at: new Date().toISOString(),
      });

      setShow2FADialog(false);
      setVerificationCode("");
      toast.success("Autenticação de dois fatores ativada com sucesso!");
    } catch (error: any) {
      console.error("Error verifying 2FA:", error);
      toast.error(error.message || "Código inválido. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      // Get current factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (totpFactor) {
        // Unenroll from MFA
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id,
        });

        if (error) throw error;
      }

      // Update profile
      await updateProfile.mutateAsync({
        two_factor_enabled: false,
        two_factor_verified_at: null,
      });

      toast.success("Autenticação de dois fatores desativada.");
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      toast.error(error.message || "Erro ao desativar autenticação de dois fatores.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("security.twoFactor.title", "Autenticação de Dois Fatores (2FA)")}
          </CardTitle>
          <CardDescription>
            {t("security.twoFactor.description", "Adicione uma camada extra de segurança à sua conta.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{t("security.twoFactor.authenticatorApp", "Aplicação Autenticadora")}</h4>
                  {is2FAEnabled && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {t("security.twoFactor.active", "Ativo")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("security.twoFactor.authenticatorDesc", "Use uma aplicação como Google Authenticator ou Authy.")}
                </p>
              </div>
            </div>
            {is2FAEnabled ? (
              <Button variant="outline" onClick={handleDisable2FA}>
                {t("security.twoFactor.disable", "Desativar")}
              </Button>
            ) : (
              <Button onClick={handleEnable2FA} disabled={isEnabling2FA}>
                {isEnabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("security.twoFactor.enable", "Ativar")}
              </Button>
            )}
          </div>

          {/* Security Recommendations */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">{t("security.recommendations.title", "Recomendações de Segurança")}</span>
            </div>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t("security.recommendations.strongPassword", "Use uma palavra-passe forte e única")}</li>
              <li>{t("security.recommendations.enable2FA", "Ative a autenticação de dois fatores")}</li>
              <li>{t("security.recommendations.checkSessions", "Verifique regularmente as sessões ativas")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <AlertDialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t("security.twoFactor.setupTitle", "Configurar Autenticação de Dois Fatores")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {t("security.twoFactor.setupStep1", "1. Instale uma aplicação autenticadora (Google Authenticator, Authy, etc.)")}
              </p>
              <p>
                {t("security.twoFactor.setupStep2", "2. Digitalize o código QR ou introduza a chave manualmente:")}
              </p>
              
              {/* QR Code placeholder - in production would show actual QR */}
              <div className="flex justify-center py-4">
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">QR Code</p>
                    <p className="text-xs text-muted-foreground">(Use o URI abaixo)</p>
                  </div>
                </div>
              </div>

              {/* Manual key */}
              <div className="space-y-2">
                <Label>{t("security.twoFactor.manualKey", "Chave manual:")}</Label>
                <div className="flex gap-2">
                  <Input 
                    value={totpSecret} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(totpSecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p>
                {t("security.twoFactor.setupStep3", "3. Introduza o código de 6 dígitos para verificar:")}
              </p>

              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setVerificationCode("");
              setTotpSecret("");
            }}>
              {t("common.cancel", "Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify2FA}
              disabled={verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("security.twoFactor.verify", "Verificar e Ativar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("security.sessions.title", "Gestão de Sessões")}
          </CardTitle>
          <CardDescription>
            {t("security.sessions.description", "Ver e gerir as suas sessões ativas.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("security.sessions.currentSession", "Sessão Atual")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("security.sessions.browser", "Navegador")}: {navigator.userAgent.split(" ").slice(-2).join(" ")}
                </p>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="mr-1 h-3 w-3" />
                {t("security.sessions.active", "Ativa")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
