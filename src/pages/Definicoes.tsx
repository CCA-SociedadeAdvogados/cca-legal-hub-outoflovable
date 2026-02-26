import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BusinessCentralSettings } from "@/components/settings/BusinessCentralSettings";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import {
  Settings,
  Pen,
  Brain,
  Bell,
  Shield,
  Upload,
  FileSignature,
  CheckCircle,
  Loader2,
  Lock,
  Building2,
} from "lucide-react";

interface SignatureProvider {
  id: string;
  name: string;
  descriptionKey: string;
  status: "configured" | "not_configured" | "coming_soon";
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

const AI_MODELS: AIModel[] = [
  { id: "gpt-5-2025-08-07", name: "GPT-5", description: "Modelo mais potente da OpenAI", recommended: true },
  { id: "gpt-5-mini-2025-08-07", name: "GPT-5 Mini", description: "Rápido e económico" },
  { id: "gpt-4.1-2025-04-14", name: "GPT-4.1", description: "Modelo estável e fiável" },
  { id: "o3-2025-04-16", name: "O3", description: "Raciocínio avançado" },
  { id: "o4-mini-2025-04-16", name: "O4 Mini", description: "Raciocínio rápido" },
];

export default function Definicoes() {
  const { t } = useTranslation();
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating } = useOrganizationSettings();
  const { isPlatformAdmin } = usePlatformAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    autoAnalyze: true,
    notifyImpacts: true,
    confidenceThreshold: 70,
    model: "gpt-5-2025-08-07",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    renewalAlerts: true,
    impactAlerts: true,
    daysBeforeExpiry: 30,
  });
  const [signatureSettings, setSignatureSettings] = useState({
    provider: "manual",
    autoSendForSignature: false,
    reminderDays: 7,
  });

  // Sync settings from database
  useEffect(() => {
    if (settings) {
      setAiSettings({
        autoAnalyze: settings.ai_auto_analyze,
        notifyImpacts: settings.ai_notify_impacts,
        confidenceThreshold: settings.ai_confidence_threshold,
        model: settings.ai_model,
      });
      setNotificationSettings({
        emailAlerts: settings.notification_email_alerts,
        renewalAlerts: settings.notification_renewal_alerts,
        impactAlerts: settings.notification_impact_alerts,
        daysBeforeExpiry: settings.notification_days_before_expiry,
      });
      setSignatureSettings({
        provider: settings.signature_provider,
        autoSendForSignature: settings.signature_auto_send,
        reminderDays: settings.signature_reminder_days,
      });
    }
  }, [settings]);

  const signatureProviders: SignatureProvider[] = [
    {
      id: "docusign",
      name: "DocuSign",
      descriptionKey: "settings.signatures.docusignDesc",
      status: "coming_soon",
    },
    {
      id: "autenticacao_gov",
      name: "Autenticação.Gov",
      descriptionKey: "settings.signatures.govDesc",
      status: "coming_soon",
    },
    {
      id: "adobe_sign",
      name: "Adobe Sign",
      descriptionKey: "settings.signatures.adobeDesc",
      status: "coming_soon",
    },
    {
      id: "manual",
      name: t('settings.signatures.manual'),
      descriptionKey: "settings.signatures.manualDesc",
      status: "configured",
    },
  ];

  const handleSaveAISettings = async () => {
    setIsLoading(true);
    try {
      updateSettings({
        ai_model: aiSettings.model,
        ai_auto_analyze: aiSettings.autoAnalyze,
        ai_notify_impacts: aiSettings.notifyImpacts,
        ai_confidence_threshold: aiSettings.confidenceThreshold,
      });
      toast.success(t('settings.ai.saveSuccess'));
    } catch (error) {
      toast.error(t('settings.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      updateSettings({
        notification_email_alerts: notificationSettings.emailAlerts,
        notification_renewal_alerts: notificationSettings.renewalAlerts,
        notification_impact_alerts: notificationSettings.impactAlerts,
        notification_days_before_expiry: notificationSettings.daysBeforeExpiry,
      });
      toast.success(t('settings.notifications.saveSuccess'));
    } catch (error) {
      toast.error(t('settings.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSignature = async () => {
    setIsLoading(true);
    try {
      updateSettings({
        signature_provider: signatureSettings.provider,
        signature_auto_send: signatureSettings.autoSendForSignature,
        signature_reminder_days: signatureSettings.reminderDays,
      });
      toast.success(t('settings.signatures.saveSuccess'));
    } catch (error) {
      toast.error(t('settings.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex flex-wrap w-full lg:w-auto lg:inline-flex">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.general')}</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.privacy', 'Privacidade')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.security', 'Segurança')}</span>
            </TabsTrigger>
            <TabsTrigger value="signatures" className="gap-2">
              <FileSignature className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.signatures')}</span>
            </TabsTrigger>
            {isPlatformAdmin && (
              <TabsTrigger value="ai" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.tabs.ai')}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="business-central" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.tabs.businessCentral', 'Business Central')}</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t('settings.general.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.general.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="language">{t('settings.general.language')}</Label>
                    <Select defaultValue="pt">
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português (Portugal)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">{t('settings.general.timezone')}</Label>
                    <Select defaultValue="europe_lisbon">
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="europe_lisbon">Europa/Lisboa (WET)</SelectItem>
                        <SelectItem value="europe_london">Europa/Londres (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">{t('settings.general.currency')}</Label>
                  <Select defaultValue="EUR">
                    <SelectTrigger id="currency" className="w-full md:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="GBP">Libra (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('settings.upload.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.upload.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('settings.upload.maxSize')}</Label>
                    <Select defaultValue="20">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 MB</SelectItem>
                        <SelectItem value="20">20 MB</SelectItem>
                        <SelectItem value="50">50 MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.upload.allowedFormats')}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">PDF</Badge>
                      <Badge variant="secondary">DOCX</Badge>
                      <Badge variant="secondary">DOC</Badge>
                      <Badge variant="secondary">XLS</Badge>
                      <Badge variant="secondary">XLSX</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>{t('settings.upload.autoAnalysis')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.upload.autoAnalysisDesc')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings - GDPR/DSAR */}
          <TabsContent value="privacy" className="space-y-6">
            <PrivacySettings />
          </TabsContent>

          {/* Security Settings - 2FA/MFA */}
          <TabsContent value="security" className="space-y-6">
            <SecuritySettings />
          </TabsContent>

          {/* Signature Settings */}
          <TabsContent value="signatures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  {t('settings.signatures.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.signatures.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {signatureProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                        signatureSettings.provider === provider.id
                          ? "border-primary bg-primary/5"
                          : provider.status === "coming_soon"
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <Pen className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{provider.name}</h4>
                            {provider.status === "configured" && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {t('settings.signatures.active')}
                              </Badge>
                            )}
                            {provider.status === "coming_soon" && (
                              <Badge variant="secondary">{t('settings.signatures.comingSoon')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t(provider.descriptionKey)}
                          </p>
                        </div>
                      </div>
                      {provider.status !== "coming_soon" && (
                        <Button
                          variant={
                            signatureSettings.provider === provider.id
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setSignatureSettings({
                              ...signatureSettings,
                              provider: provider.id,
                            })
                          }
                        >
                          {signatureSettings.provider === provider.id
                            ? t('settings.signatures.selected')
                            : t('settings.signatures.select')}
                        </Button>
                      )}
                      {provider.status === "coming_soon" && (
                        <Button variant="outline" size="sm" disabled>
                          {t('settings.signatures.comingSoon')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">{t('settings.signatures.settingsTitle')}</h4>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>{t('settings.signatures.autoSend')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.signatures.autoSendDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={signatureSettings.autoSendForSignature}
                      onCheckedChange={(checked) =>
                        setSignatureSettings({
                          ...signatureSettings,
                          autoSendForSignature: checked,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminderDays">{t('settings.signatures.reminder')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="reminderDays"
                        type="number"
                        value={signatureSettings.reminderDays}
                        onChange={(e) =>
                          setSignatureSettings({
                            ...signatureSettings,
                            reminderDays: parseInt(e.target.value) || 7,
                          })
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">{t('settings.signatures.daysAfterSend')}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSignature} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveSettings')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('settings.certificates.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.certificates.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <FileSignature className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h4 className="mt-4 font-medium">{t('settings.certificates.noCertificate')}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('settings.certificates.configure')}
                  </p>
                  <Button variant="outline" className="mt-4" disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('settings.certificates.uploadComing')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings - Only visible for platform admins */}
          {isPlatformAdmin && (
            <TabsContent value="ai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {t('settings.ai.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.ai.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="aiModel">{t('settings.ai.model')}</Label>
                    <Select
                      value={aiSettings.model}
                      onValueChange={(value) =>
                        setAiSettings({ ...aiSettings, model: value })
                      }
                    >
                      <SelectTrigger id="aiModel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              {model.recommended && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('settings.ai.recommended')}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                - {model.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Modelo OpenAI para análise de contratos e compliance
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>{t('settings.ai.autoAnalysis')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.ai.autoAnalysisDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={aiSettings.autoAnalyze}
                      onCheckedChange={(checked) =>
                        setAiSettings({ ...aiSettings, autoAnalyze: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>{t('settings.ai.notifyImpacts')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.ai.notifyImpactsDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={aiSettings.notifyImpacts}
                      onCheckedChange={(checked) =>
                        setAiSettings({ ...aiSettings, notifyImpacts: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confidence">{t('settings.ai.confidence')}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="confidence"
                        type="number"
                        min="50"
                        max="100"
                        value={aiSettings.confidenceThreshold}
                        onChange={(e) =>
                          setAiSettings({
                            ...aiSettings,
                            confidenceThreshold: parseInt(e.target.value) || 70,
                          })
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.ai.confidenceHelp')}
                    </p>
                  </div>

                  <Button onClick={handleSaveAISettings} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('settings.saveSettings')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('settings.notifications.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.notifications.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>{t('settings.notifications.emailAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.notifications.emailAlertsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailAlerts: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>{t('settings.notifications.renewalAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.notifications.renewalAlertsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.renewalAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        renewalAlerts: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>{t('settings.notifications.impactAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.notifications.impactAlertsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.impactAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        impactAlerts: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daysBeforeExpiry">{t('settings.notifications.daysBeforeExpiry')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="daysBeforeExpiry"
                      type="number"
                      value={notificationSettings.daysBeforeExpiry}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          daysBeforeExpiry: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">{t('settings.notifications.days')}</span>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveSettings')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business-central" className="space-y-6">
            <BusinessCentralSettings />
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}