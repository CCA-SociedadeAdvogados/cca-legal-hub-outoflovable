import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useSharePointConfigByOrgId,
  useSaveSharePointConfigForOrg,
  useListSharePointDrives,
  useBrowseSharePointFolders,
  type SharePointDrive,
  type SharePointFolder,
} from "@/hooks/useSharePoint";
import { Cloud, Loader2, FolderOpen, RefreshCw, CheckCircle, Check, Library } from "lucide-react";

interface OrgSharePointConfigProps {
  organizationId: string | null;
}

export function OrgSharePointConfig({ organizationId }: OrgSharePointConfigProps) {
  const { t } = useTranslation();
  const { data: existingConfig, isLoading: isLoadingConfig } = useSharePointConfigByOrgId(organizationId);
  const saveConfig = useSaveSharePointConfigForOrg();
  const listDrives = useListSharePointDrives();
  const browseFolders = useBrowseSharePointFolders();

  const [siteId, setSiteId] = useState("");
  const [driveId, setDriveId] = useState("");
  const [rootFolderPath, setRootFolderPath] = useState("/");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5);
  const [drives, setDrives] = useState<SharePointDrive[]>([]);
  const [folders, setFolders] = useState<SharePointFolder[]>([]);

  // Load existing config
  useEffect(() => {
    if (existingConfig) {
      setSiteId(existingConfig.site_id || "");
      setDriveId(existingConfig.drive_id || "");
      setRootFolderPath(existingConfig.root_folder_path || "/");
      setSyncEnabled(existingConfig.sync_enabled);
      setSyncInterval(existingConfig.sync_interval_minutes);
    } else {
      setSiteId("");
      setDriveId("");
      setRootFolderPath("/");
      setSyncEnabled(true);
      setSyncInterval(5);
      setDrives([]);
      setFolders([]);
    }
  }, [existingConfig]);

  const loadFolders = useCallback(async (orgId: string, targetDriveId: string) => {
    try {
      const result = await browseFolders.mutateAsync({
        organization_id: orgId,
        drive_id: targetDriveId,
        folder_path: "/",
      });
      setFolders(result);
    } catch (error) {
      console.error("Error browsing folders:", error);
    }
  }, [browseFolders]);

  // Auto-load folders when driveId changes and drives are loaded
  useEffect(() => {
    if (driveId && organizationId && drives.length > 0) {
      loadFolders(organizationId, driveId);
    }
  }, [driveId, drives.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleListDrives = async () => {
    if (!organizationId || !siteId.trim()) return;

    try {
      await saveConfig.mutateAsync({
        organization_id: organizationId,
        site_id: siteId.trim(),
        sync_enabled: syncEnabled,
        sync_interval_minutes: syncInterval,
        root_folder_path: rootFolderPath,
        drive_id: driveId || undefined,
      });

      const result = await listDrives.mutateAsync({ organization_id: organizationId });
      setDrives(result.drives);
      if (result.current_drive_id && !driveId) {
        setDriveId(result.current_drive_id);
      } else if (result.current_drive_id) {
        // Trigger folder load for current driveId with new drives list
        loadFolders(organizationId, driveId || result.current_drive_id);
      }
    } catch (error) {
      console.error("Error listing drives:", error);
    }
  };

  const handleDriveChange = (val: string) => {
    setDriveId(val);
    setFolders([]);
    // Auto-browse folders for selected drive
    if (organizationId) {
      browseFolders.mutateAsync({
        organization_id: organizationId,
        drive_id: val,
        folder_path: "/",
      }).then(setFolders).catch(console.error);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !siteId.trim()) return;

    await saveConfig.mutateAsync({
      organization_id: organizationId,
      site_id: siteId.trim(),
      drive_id: driveId || undefined,
      root_folder_path: rootFolderPath,
      sync_enabled: syncEnabled,
      sync_interval_minutes: syncInterval,
    });
  };

  const selectedDrive = drives.find(d => d.id === driveId);

  if (isLoadingConfig) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">A carregar configuração SharePoint...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2 flex-wrap">
        <Cloud className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base font-medium">Configuração SharePoint</Label>
        {existingConfig && (
          <Badge variant="outline" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Configurado
          </Badge>
        )}
        {existingConfig?.drive_id && (
          <Badge variant="secondary" className="text-xs ml-auto">
            <Library className="h-3 w-3 mr-1" />
            {selectedDrive ? selectedDrive.name : `Drive: ...${existingConfig.drive_id.slice(-8)}`}
          </Badge>
        )}
      </div>

      {/* Site ID */}
      <div className="grid gap-2">
        <Label htmlFor="sp-site-id">Site ID</Label>
        <div className="flex gap-2">
          <Input
            id="sp-site-id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="contoso.sharepoint.com,guid,guid"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleListDrives}
            disabled={!siteId.trim() || listDrives.isPending || saveConfig.isPending}
          >
            {(listDrives.isPending || saveConfig.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Listar Bibliotecas</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Formato: hostname,site-collection-guid,site-guid
        </p>
      </div>

      {/* Drive selector — shown if drives were loaded OR if there's already a saved drive_id */}
      {(drives.length > 0 || existingConfig?.drive_id) && (
        <div className="grid gap-2">
          <Label>Biblioteca (Drive)</Label>
          {drives.length > 0 ? (
            <div className="flex gap-2">
              <Select value={driveId} onValueChange={handleDriveChange}>
                <SelectTrigger className="flex-1 bg-popover">
                  <SelectValue placeholder="Selecione uma biblioteca" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {drives.map((drive) => (
                    <SelectItem key={drive.id} value={drive.id}>
                      <div className="flex items-center gap-2">
                        <Library className="h-3 w-3 text-muted-foreground" />
                        <span>{drive.name}</span>
                        <span className="text-xs text-muted-foreground">({drive.driveType})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {browseFolders.isPending && (
                <div className="flex items-center px-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm">
              <Library className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Drive configurada:</span>
              <code className="text-xs font-mono">...{existingConfig?.drive_id?.slice(-12)}</code>
              <span className="text-xs text-muted-foreground ml-auto">(clique em "Listar Bibliotecas" para alterar)</span>
            </div>
          )}
        </div>
      )}

      {/* Folder browser */}
      {folders.length > 0 && (
        <div className="grid gap-2">
          <Label>Pasta raiz de sincronização</Label>
          <div className="border rounded-md max-h-48 overflow-y-auto">
            {/* Root option */}
            <button
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                rootFolderPath === "/" ? "bg-accent/60 font-medium" : ""
              }`}
              onClick={() => setRootFolderPath("/")}
            >
              {rootFolderPath === "/" ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <FolderOpen className="h-3 w-3 text-muted-foreground" />
              )}
              <span>/ (raiz da biblioteca)</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                  rootFolderPath === folder.path ? "bg-accent/60 font-medium" : ""
                }`}
                onClick={() => setRootFolderPath(folder.path)}
              >
                {rootFolderPath === folder.path ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <FolderOpen className="h-3 w-3 text-muted-foreground" />
                )}
                <span>{folder.name}</span>
                <span className="text-xs text-muted-foreground font-mono ml-1">{folder.path}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {folder.childCount} itens
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Root folder path (manual input fallback) */}
      <div className="grid gap-2">
        <Label htmlFor="sp-root-path">Pasta Raiz (path manual)</Label>
        <Input
          id="sp-root-path"
          value={rootFolderPath}
          onChange={(e) => setRootFolderPath(e.target.value)}
          placeholder="/ ou /Cliente_B"
        />
        <p className="text-xs text-muted-foreground">
          Selecione acima ou escreva manualmente (ex: /Cliente_B)
        </p>
      </div>

      {/* Sync settings */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Sincronização automática</Label>
          <p className="text-xs text-muted-foreground">Ativar sync periódico</p>
        </div>
        <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
      </div>

      {syncEnabled && (
        <div className="grid gap-2">
          <Label htmlFor="sp-interval">Intervalo (minutos)</Label>
          <Input
            id="sp-interval"
            type="number"
            min={1}
            max={60}
            value={syncInterval}
            onChange={(e) => setSyncInterval(Number(e.target.value))}
            className="w-32"
          />
        </div>
      )}

      {/* Save button */}
      <Button
        type="button"
        onClick={handleSave}
        disabled={!siteId.trim() || saveConfig.isPending}
        className="w-full"
      >
        {saveConfig.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            A guardar...
          </>
        ) : (
          "Guardar Configuração SharePoint"
        )}
      </Button>
    </div>
  );
}
