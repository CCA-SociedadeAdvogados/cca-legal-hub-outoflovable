import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useCliente } from '@/contexts/ClienteContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Para utilizadores CCA internos (SSO), o cliente em visualização
// (ClienteContext.viewingOrganizationId) tem prioridade sobre a organização
// do próprio perfil — sem isto, um advogado CCA a ver o cliente X listava e
// carregava ficheiros para a org CCA em vez do cliente (cross-tenant).
// Para clientes externos, viewingOrganizationId é sempre null e o fallback
// para current_organization_id mantém o comportamento correcto.
function useEffectiveOrganizationId(overrideOrgId?: string) {
  const { profile } = useProfile();
  const { viewingOrganizationId } = useCliente();
  return overrideOrgId || viewingOrganizationId || profile?.current_organization_id || null;
}

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
  last_sync_status: 'success' | 'error' | 'in_progress' | null;
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
  status: 'running' | 'success' | 'error';
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
export function useSharePointConfig(overrideOrgId?: string) {
  const organizationId = useEffectiveOrganizationId(overrideOrgId);

  return useQuery({
    queryKey: ['sharepoint-config', organizationId],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<SharePointConfig | null> => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('sharepoint_config')
        .select(
          `
          id,
          organization_id,
          site_id,
          site_name,
          site_url,
          drive_id,
          root_folder_path,
          sync_enabled,
          sync_interval_minutes,
          last_sync_at,
          last_sync_status,
          last_sync_error,
          created_at,
          updated_at
        `,
        )
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SharePoint config:', error);
        return null;
      }

      return (data as SharePointConfig | null) ?? null;
    },
    enabled: !!organizationId,
  });
}

// Hook para obter documentos do SharePoint
export function useSharePointDocuments(folderPath: string = '/', overrideOrgId?: string) {
  const organizationId = useEffectiveOrganizationId(overrideOrgId);

  return useQuery({
    queryKey: ['sharepoint-documents', organizationId, folderPath],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SharePointDocument[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('sharepoint_documents')
        .select(
          `
          id,
          organization_id,
          config_id,
          sharepoint_item_id,
          name,
          file_extension,
          mime_type,
          size_bytes,
          web_url,
          folder_path,
          is_folder,
          sharepoint_modified_at,
          sharepoint_modified_by,
          synced_at,
          is_deleted
        `,
        )
        .eq('organization_id', organizationId)
        .eq('folder_path', folderPath)
        .eq('is_deleted', false)
        .order('is_folder', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching SharePoint documents:', error);
        return [];
      }

      return (data as SharePointDocument[]) ?? [];
    },
    enabled: !!organizationId,
  });
}

// Hook para obter logs de sincronização
export function useSharePointSyncLogs(limit: number = 10, overrideOrgId?: string) {
  const organizationId = useEffectiveOrganizationId(overrideOrgId);

  return useQuery({
    queryKey: ['sharepoint-sync-logs', organizationId, limit],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SharePointSyncLog[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('sharepoint_sync_logs')
        .select(
          `
          id,
          config_id,
          started_at,
          completed_at,
          status,
          items_found,
          items_added,
          items_updated,
          items_deleted,
          error_message
        `,
        )
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching SharePoint sync logs:', error);
        return [];
      }

      return (data as SharePointSyncLog[]) ?? [];
    },
    enabled: !!organizationId,
  });
}

// Hook para salvar/atualizar configuração
export function useSaveSharePointConfig(overrideOrgId?: string) {
  const queryClient = useQueryClient();
  const organizationId = useEffectiveOrganizationId(overrideOrgId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (config: {
      site_id: string;
      sync_enabled?: boolean;
      sync_interval_minutes?: number;
      root_folder_path?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'save_config',
          organization_id: organizationId,
          config: {
            site_id: config.site_id,
            sync_enabled: config.sync_enabled ?? true,
            sync_interval_minutes: config.sync_interval_minutes ?? 5,
            root_folder_path: config.root_folder_path ?? '/',
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-config', organizationId] });
      toast.success(t('sharepoint.configSaved', 'Configuração SharePoint guardada'));
    },
    onError: (error) => {
      console.error('Error saving SharePoint config:', error);
      toast.error(t('sharepoint.configError', 'Erro ao guardar configuração'));
    },
  });
}

// Hook para sincronizar manualmente
export function useSyncSharePoint(overrideOrgId?: string) {
  const queryClient = useQueryClient();
  const organizationId = useEffectiveOrganizationId(overrideOrgId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (options?: { force_full_sync?: boolean }): Promise<SyncResult> => {
      if (!organizationId) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          organization_id: organizationId,
          force_full_sync: options?.force_full_sync ?? false,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // A edge function devolve HTTP 200 com { success: false, error } em caso
      // de falha — sem isto o utilizador não recebia qualquer feedback.
      const result = data as SyncResult;
      if (!result?.success) {
        throw new Error(result?.error || 'Sync failed');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-config', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-sync-logs', organizationId] });

      if (result.success && result.data) {
        const { items_added, items_updated, items_deleted } = result.data;
        toast.success(
          t(
            'sharepoint.syncSuccess',
            'Sincronização concluída: {{added}} novos, {{updated}} atualizados, {{deleted}} removidos',
            {
              added: items_added,
              updated: items_updated,
              deleted: items_deleted,
            },
          ),
        );
      }
    },
    onError: (error: Error) => {
      console.error('Sync error:', error);
      toast.error(
        t('sharepoint.syncError', 'Erro na sincronização: {{message}}', { message: error.message }),
      );
    },
  });
}

// Hook para fazer upload de ficheiros para o SharePoint
export function useUploadToSharePoint(overrideOrgId?: string) {
  const queryClient = useQueryClient();
  const effectiveOrgId = useEffectiveOrganizationId(overrideOrgId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      file,
      folderPath,
      fileName,
    }: {
      file: File;
      folderPath: string;
      /** Nome final do ficheiro (com extensão). Por omissão usa file.name. */
      fileName?: string;
    }) => {
      const organizationId = effectiveOrgId;
      if (!organizationId) {
        throw new Error('Organization not found');
      }

      if (file.size > 4 * 1024 * 1024) {
        throw new Error(t('sharepoint.upload.tooLarge', 'Ficheiro demasiado grande. Limite: 4MB'));
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'upload_file',
          organization_id: organizationId,
          file_base64: base64,
          file_name: fileName?.trim() || file.name,
          folder_path: folderPath,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
      toast.success(t('sharepoint.upload.success', 'Ficheiro carregado com sucesso'));
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast.error(
        t('sharepoint.upload.error', 'Erro ao carregar ficheiro: {{message}}', {
          message: error.message,
        }),
      );
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
        throw new Error('Organization not found');
      }

      const { error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'delete_config',
          organization_id: profile.current_organization_id,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-config'] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
      toast.success(t('sharepoint.configDeleted', 'Configuração SharePoint removida'));
    },
    onError: (error) => {
      console.error('Error deleting SharePoint config:', error);
      toast.error(t('sharepoint.deleteError', 'Erro ao remover configuração'));
    },
  });
}

// Hook para criar pasta no SharePoint
export function useCreateSharePointFolder() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { organization_id: string; folder_path: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'create_folder',
          organization_id: params.organization_id,
          folder_path: params.folder_path,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create folder');
      return data;
    },
    onError: (error: Error) => {
      console.error('Create folder error:', error);
      toast.error(
        t('sharepoint.createFolder.error', 'Erro ao criar pasta: {{message}}', {
          message: error.message,
        }),
      );
    },
  });
}

// Lista todas as pastas (full path) da org, para escolher destino de upload/mover.
export function useSharePointFolders(overrideOrgId?: string) {
  const organizationId = useEffectiveOrganizationId(overrideOrgId);

  return useQuery({
    queryKey: ['sharepoint-folders', organizationId],
    staleTime: 30 * 1000,
    enabled: !!organizationId,
    queryFn: async (): Promise<string[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sharepoint_documents')
        .select('name, folder_path')
        .eq('organization_id', organizationId)
        .eq('is_folder', true)
        .eq('is_deleted', false);
      if (error) {
        console.error('Error fetching SharePoint folders:', error);
        return [];
      }
      const paths = (data ?? []).map((d) => {
        const parent = d.folder_path === '/' ? '' : d.folder_path;
        return `${parent}/${d.name}`;
      });
      return Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b, 'pt'));
    },
  });
}

// Mover um documento (ou pasta) para outra pasta de destino.
export function useMoveSharePointItem(overrideOrgId?: string) {
  const queryClient = useQueryClient();
  const effectiveOrgId = useEffectiveOrganizationId(overrideOrgId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      sharepoint_item_id: string;
      destination_path: string;
      new_name?: string;
    }) => {
      const organizationId = effectiveOrgId;
      if (!organizationId) throw new Error('Organization not found');

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'move_item',
          organization_id: organizationId,
          sharepoint_item_id: params.sharepoint_item_id,
          destination_path: params.destination_path,
          new_name: params.new_name,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Move failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
      toast.success(t('sharepoint.move.success', 'Documento movido'));
    },
    onError: (error: Error) => {
      toast.error(
        t('sharepoint.move.error', 'Erro ao mover: {{message}}', { message: error.message }),
      );
    },
  });
}

export interface DocumentClassification {
  suggested_name: string;
  doc_type: string;
  suggested_folder: string;
  is_new_folder: boolean;
  has_text: boolean;
}

// Classifica um documento com IA (nome + tipo + pasta recomendada). Não grava nada.
export function useClassifyDocument(overrideOrgId?: string) {
  const effectiveOrgId = useEffectiveOrganizationId(overrideOrgId);

  return useMutation({
    mutationFn: async ({
      file,
      existingFolders,
    }: {
      file: File;
      existingFolders: string[];
    }): Promise<DocumentClassification> => {
      const organizationId = effectiveOrgId;
      if (!organizationId) throw new Error('Organization not found');

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('classify-document', {
        body: {
          organization_id: organizationId,
          file_base64: base64,
          file_name: file.name,
          existing_folders: existingFolders,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.suggestion as DocumentClassification;
    },
  });
}

// Hook para criar pastas de contrato automaticamente no SharePoint
export function useCreateContractFolders() {
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      contrato_id: string;
      client_code?: string;
      tipo_contrato?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'create_contract_folders',
          organization_id: params.organization_id,
          contrato_id: params.contrato_id,
          client_code: params.client_code,
          tipo_contrato: params.tipo_contrato,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      // Non-blocking — don't show error to user, just log
      console.warn('SharePoint contract folder creation failed (non-blocking):', error.message);
    },
  });
}

// Hook para upload de ficheiros grandes (>4MB) via upload session
export function useUploadLargeToSharePoint(overrideOrgId?: string) {
  const queryClient = useQueryClient();
  const effectiveOrgId = useEffectiveOrganizationId(overrideOrgId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ file, folderPath }: { file: File; folderPath: string }) => {
      if (!effectiveOrgId) {
        throw new Error('Organization not found');
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'upload_large_file',
          organization_id: effectiveOrgId,
          file_base64: base64,
          file_name: file.name,
          folder_path: folderPath,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
      toast.success(t('sharepoint.upload.success', 'Ficheiro carregado com sucesso'));
    },
    onError: (error: Error) => {
      console.error('Large upload error:', error);
      toast.error(
        t('sharepoint.upload.error', 'Erro ao carregar ficheiro: {{message}}', {
          message: error.message,
        }),
      );
    },
  });
}

// Hook para garantir que a pasta do cliente existe no SharePoint (auto-criação na primeira visita)
// configOrgId: org que tem o SharePoint configurado (ex: CCA). Se omitido, usa dataOrgId.
export function useEnsureClientFolder(dataOrgId: string | null, configOrgId?: string | null) {
  const queryClient = useQueryClient();
  const effectiveConfigOrgId = configOrgId ?? dataOrgId;

  const { data: config, isLoading: isLoadingConfig } = useSharePointConfig(
    effectiveConfigOrgId ?? undefined,
  );

  const { data: orgData } = useQuery({
    queryKey: ['organization-client-code', dataOrgId],
    staleTime: 10 * 60 * 1000,
    enabled: !!dataOrgId,
    queryFn: async () => {
      if (!dataOrgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name, client_code')
        .eq('id', dataOrgId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching org data for folder creation:', error);
        return null;
      }
      return data;
    },
  });

  const createFolder = useCreateSharePointFolder();

  const folderName = orgData?.client_code || orgData?.name || 'Documentos';
  const folderPath = `/${folderName}`;

  const { data: ensured } = useQuery({
    queryKey: ['sharepoint-client-folder-ensured', effectiveConfigOrgId, folderPath],
    staleTime: Infinity,
    enabled: !!effectiveConfigOrgId && !!config && !!orgData && !createFolder.isPending,
    queryFn: async () => {
      if (!effectiveConfigOrgId || !config) return false;
      try {
        await createFolder.mutateAsync({
          organization_id: effectiveConfigOrgId,
          folder_path: folderPath,
        });
        queryClient.invalidateQueries({ queryKey: ['sharepoint-documents', effectiveConfigOrgId] });
      } catch {
        // Folder may already exist — not an error
      }
      return true;
    },
  });

  return {
    folderPath,
    isReady: !!config && !!orgData,
    isEnsuring: isLoadingConfig || (!!config && !!orgData && !ensured),
  };
}

// ====== Admin-specific hooks ======

// Hook para obter config SharePoint por orgId (para admins)
export function useSharePointConfigByOrgId(orgId: string | null) {
  return useQuery({
    queryKey: ['sharepoint-config', orgId],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<SharePointConfig | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from('sharepoint_config')
        .select(
          `
          id,
          organization_id,
          site_id,
          site_name,
          site_url,
          drive_id,
          root_folder_path,
          sync_enabled,
          sync_interval_minutes,
          last_sync_at,
          last_sync_status,
          last_sync_error,
          created_at,
          updated_at
        `,
        )
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SharePoint config by orgId:', error);
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
      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'save_config',
          organization_id: params.organization_id,
          config: {
            site_id: params.site_id,
            drive_id: params.drive_id,
            sync_enabled: params.sync_enabled ?? true,
            sync_interval_minutes: params.sync_interval_minutes ?? 5,
            root_folder_path: params.root_folder_path ?? '/',
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sharepoint-config', variables.organization_id] });
      toast.success(t('sharepoint.configSaved', 'Configuração SharePoint guardada'));
    },
    onError: (error) => {
      console.error('Error saving SharePoint config:', error);
      toast.error(t('sharepoint.configError', 'Erro ao guardar configuração'));
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
    mutationFn: async (params: {
      organization_id: string;
    }): Promise<{ drives: SharePointDrive[]; current_drive_id: string | null }> => {
      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'list_drives',
          organization_id: params.organization_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to list drives');
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
    mutationFn: async (params: {
      organization_id: string;
      drive_id?: string;
      folder_path?: string;
    }): Promise<SharePointFolder[]> => {
      const { data, error } = await supabase.functions.invoke('sync-sharepoint', {
        body: {
          action: 'browse_folders',
          organization_id: params.organization_id,
          drive_id: params.drive_id,
          folder_path: params.folder_path || '/',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to browse folders');
      return data.folders || [];
    },
  });
}
