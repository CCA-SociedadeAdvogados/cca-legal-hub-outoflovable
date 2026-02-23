import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface SharePointConfig {
  id: string;
  organization_id: string;
  site_id: string;
  site_name: string | null;
  site_url: string | null;
  drive_id: string | null;
  root_folder_path: string;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | "in_progress" | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharePointDocument {
  id: string;
  organization_id: string;
  config_id: string;
  sharepoint_item_id: string;
  name: string;
  file_extension: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  web_url: string | null;
  folder_path: string;
  is_folder: boolean;
  sharepoint_modified_at: string | null;
  sharepoint_modified_by: string | null;
  synced_at: string;
  is_deleted: boolean;
}

export interface SharePointSyncLog {
  id: string;
  config_id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "success" | "error";
  items_found: number;
  items_added: number;
  items_updated: number;
  items_deleted: number;
  error_message: string | null;
}

export interface SyncResult {
  success: boolean;
  data?: {
    items_found: number;
    items_added: number;
    items_updated: number;
    items_deleted: number;
    site_name: string;
    site_url: string;
  };
  error?: string;
}

// Hook para obter a configuração do SharePoint
export function useSharePointConfig() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["sharepoint-config", profile?.current_organization_id],
    queryFn: async (): Promise<SharePointConfig | null> => {
      if (!profile?.current_organization_id) return null;

      const { data, error } = await (supabase as any)
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", profile.current_organization_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching SharePoint config:", error);
        return null;
      }

      return data as SharePointConfig | null;
    },
    enabled: !!profile?.current_organization_id,
  });
}

// Hook para obter documentos do SharePoint
export function useSharePointDocuments(folderPath: string = "/") {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["sharepoint-documents", profile?.current_organization_id, folderPath],
    queryFn: async (): Promise<SharePointDocument[]> => {
      if (!profile?.current_organization_id) return [];

      const { data, error } = await (supabase as any)
        .from("sharepoint_documents")
        .select("*")
        .eq("organization_id", profile.current_organization_id)
        .eq("folder_path", folderPath)
        .eq("is_deleted", false)
        .order("is_folder", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching SharePoint documents:", error);
        return [];
      }

      return (data || []) as SharePointDocument[];
    },
    enabled: !!profile?.current_organization_id,
  });
}

// Hook para obter logs de sincronização
export function useSharePointSyncLogs(limit: number = 10) {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["sharepoint-sync-logs", profile?.current_organization_id, limit],
    queryFn: async (): Promise<SharePointSyncLog[]> => {
      if (!profile?.current_organization_id) return [];

      const { data, error } = await (supabase as any)
        .from("sharepoint_sync_logs")
        .select("*")
        .eq("organization_id", profile.current_organization_id)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching SharePoint sync logs:", error);
        return [];
      }

      return (data || []) as SharePointSyncLog[];
    },
    enabled: !!profile?.current_organization_id,
  });
}

// Hook para salvar/atualizar configuração
export function useSaveSharePointConfig() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (config: { site_id: string; sync_enabled?: boolean; sync_interval_minutes?: number; root_folder_path?: string }) => {
      if (!profile?.current_organization_id) {
        throw new Error("Organization not found");
      }

      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "save_config",
          organization_id: profile.current_organization_id,
          config: {
            site_id: config.site_id,
            sync_enabled: config.sync_enabled ?? true,
            sync_interval_minutes: config.sync_interval_minutes ?? 5,
            root_folder_path: config.root_folder_path ?? "/",
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharepoint-config"] });
      toast.success(t("sharepoint.configSaved", "Configuração SharePoint guardada"));
    },
    onError: (error) => {
      console.error("Error saving SharePoint config:", error);
      toast.error(t("sharepoint.configError", "Erro ao guardar configuração"));
    },
  });
}

// Hook para sincronizar manualmente
export function useSyncSharePoint() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (options?: { force_full_sync?: boolean }): Promise<SyncResult> => {
      if (!profile?.current_organization_id) {
        throw new Error("Organization not found");
      }

      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          organization_id: profile.current_organization_id,
          force_full_sync: options?.force_full_sync ?? false,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as SyncResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sharepoint-documents"] });
      queryClient.invalidateQueries({ queryKey: ["sharepoint-config"] });
      queryClient.invalidateQueries({ queryKey: ["sharepoint-sync-logs"] });

      if (result.success && result.data) {
        const { items_added, items_updated, items_deleted } = result.data;
        toast.success(
          t("sharepoint.syncSuccess", "Sincronização concluída: {{added}} novos, {{updated}} atualizados, {{deleted}} removidos", {
            added: items_added,
            updated: items_updated,
            deleted: items_deleted,
          })
        );
      }
    },
    onError: (error: Error) => {
      console.error("Sync error:", error);
      toast.error(t("sharepoint.syncError", "Erro na sincronização: {{message}}", { message: error.message }));
    },
  });
}

// Hook para fazer upload de ficheiros para o SharePoint
export function useUploadToSharePoint() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ file, folderPath }: { file: File; folderPath: string }) => {
      if (!profile?.current_organization_id) {
        throw new Error("Organization not found");
      }

      if (file.size > 4 * 1024 * 1024) {
        throw new Error(t("sharepoint.upload.tooLarge", "Ficheiro demasiado grande. Limite: 4MB"));
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "upload_file",
          organization_id: profile.current_organization_id,
          file_base64: base64,
          file_name: file.name,
          folder_path: folderPath,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharepoint-documents"] });
      toast.success(t("sharepoint.upload.success", "Ficheiro carregado com sucesso"));
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      toast.error(t("sharepoint.upload.error", "Erro ao carregar ficheiro: {{message}}", { message: error.message }));
    },
  });
}

// Hook para eliminar configuração
export function useDeleteSharePointConfig() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.current_organization_id) {
        throw new Error("Organization not found");
      }

      const { error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "delete_config",
          organization_id: profile.current_organization_id,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharepoint-config"] });
      queryClient.invalidateQueries({ queryKey: ["sharepoint-documents"] });
      toast.success(t("sharepoint.configDeleted", "Configuração SharePoint removida"));
    },
    onError: (error) => {
      console.error("Error deleting SharePoint config:", error);
      toast.error(t("sharepoint.deleteError", "Erro ao remover configuração"));
    },
  });
}

// ====== Admin-specific hooks ======

// Hook para obter config SharePoint por orgId (para admins)
export function useSharePointConfigByOrgId(orgId: string | null) {
  return useQuery({
    queryKey: ["sharepoint-config", orgId],
    queryFn: async (): Promise<SharePointConfig | null> => {
      if (!orgId) return null;

      const { data, error } = await (supabase as any)
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching SharePoint config by orgId:", error);
        return null;
      }

      return data as SharePointConfig | null;
    },
    enabled: !!orgId,
  });
}

// Hook para guardar config SharePoint para uma org específica
export function useSaveSharePointConfigForOrg() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      site_id: string;
      drive_id?: string;
      root_folder_path?: string;
      sync_enabled?: boolean;
      sync_interval_minutes?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "save_config",
          organization_id: params.organization_id,
          config: {
            site_id: params.site_id,
            drive_id: params.drive_id,
            sync_enabled: params.sync_enabled ?? true,
            sync_interval_minutes: params.sync_interval_minutes ?? 5,
            root_folder_path: params.root_folder_path ?? "/",
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sharepoint-config", variables.organization_id] });
      toast.success(t("sharepoint.configSaved", "Configuração SharePoint guardada"));
    },
    onError: (error) => {
      console.error("Error saving SharePoint config:", error);
      toast.error(t("sharepoint.configError", "Erro ao guardar configuração"));
    },
  });
}

export interface SharePointDrive {
  id: string;
  name: string;
  webUrl: string;
  driveType: string;
}

// Hook para listar drives/bibliotecas de um site SharePoint
export function useListSharePointDrives() {
  return useMutation({
    mutationFn: async (params: { organization_id: string }): Promise<{ drives: SharePointDrive[]; current_drive_id: string | null }> => {
      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "list_drives",
          organization_id: params.organization_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to list drives");
      return { drives: data.drives || [], current_drive_id: data.current_drive_id };
    },
  });
}

export interface SharePointFolder {
  name: string;
  path: string;
  childCount: number;
}

// Hook para navegar pastas de uma drive SharePoint
export function useBrowseSharePointFolders() {
  return useMutation({
    mutationFn: async (params: { organization_id: string; drive_id?: string; folder_path?: string }): Promise<SharePointFolder[]> => {
      const { data, error } = await supabase.functions.invoke("sync-sharepoint", {
        body: {
          action: "browse_folders",
          organization_id: params.organization_id,
          drive_id: params.drive_id,
          folder_path: params.folder_path || "/",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to browse folders");
      return data.folders || [];
    },
  });
}
