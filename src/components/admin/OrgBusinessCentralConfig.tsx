import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useBusinessCentralConfigByOrgId,
  useSaveBusinessCentralConfigForOrg,
} from "@/hooks/useBusinessCentral";
import { Building2, Loader2, CheckCircle } from "lucide-react";

interface OrgBusinessCentralConfigProps {
  organizationId: string | null;
}

export function OrgBusinessCentralConfig({ organizationId }: OrgBusinessCentralConfigProps) {
  const { t } = useTranslation();
  const { data: existingConfig, isLoading } = useBusinessCentralConfigByOrgId(organizationId);
  const saveConfig = useSaveBusinessCentralConfigForOrg();

  const [bcUrl, setBcUrl] = useState("");
  const [companyGuid, setCompanyGuid] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (existingConfig) {
      setBcUrl(existingConfig.bc_url || "");
      setCompanyGuid(existingConfig.company_guid || "");
      setCompanyName(existingConfig.company_name || "");
      setIsEnabled(existingConfig.is_enabled);
    } else {
      setBcUrl("");
      setCompanyGuid("");
      setCompanyName("");
      setIsEnabled(true);
    }
  }, [existingConfig]);

  const handleSave = () => {
    if (!organizationId || !bcUrl.trim() || !companyGuid.trim()) return;
    saveConfig.mutate({
      organization_id: organizationId,
      bc_url: bcUrl.trim(),
      company_guid: companyGuid.trim(),
      company_name: companyName.trim() || undefined,
      is_enabled: isEnabled,
    });
  };

  if (!organizationId) return null;

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("businessCentral.admin.title", "Business Central")}</span>
          {existingConfig?.is_enabled && (
            <Badge className="bg-green-100 text-green-800 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t("businessCentral.admin.active", "Ativo")}
            </Badge>
          )}
          {existingConfig && !existingConfig.is_enabled && (
            <Badge variant="outline" className="text-xs">
              {t("businessCentral.admin.inactive", "Inativo")}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading", "A carregar...")}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("businessCentral.settings.bcUrl", "URL do Servidor BC")}</Label>
            <Input
              value={bcUrl}
              onChange={(e) => setBcUrl(e.target.value)}
              placeholder="http://servidor:2053/BC140WS"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("businessCentral.settings.companyGuid", "GUID da Empresa")}</Label>
            <Input
              value={companyGuid}
              onChange={(e) => setCompanyGuid(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("businessCentral.settings.companyName", "Nome (opcional)")}</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Empresa, Lda."
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("businessCentral.settings.enabled", "Integração ativa")}</Label>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveConfig.isPending || !bcUrl.trim() || !companyGuid.trim()}
          >
            {saveConfig.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {t("common.save", "Guardar")}
          </Button>
        </div>
      )}
    </div>
  );
}
