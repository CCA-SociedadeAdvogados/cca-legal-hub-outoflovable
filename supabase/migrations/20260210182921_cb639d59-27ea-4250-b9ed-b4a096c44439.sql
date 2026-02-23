
-- =============================================
-- SharePoint Integration Tables
-- =============================================

-- 1. sharepoint_config - Configuration per organization
CREATE TABLE public.sharepoint_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  site_name TEXT,
  site_url TEXT,
  drive_id TEXT,
  root_folder_path TEXT NOT NULL DEFAULT '/',
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_delta_token TEXT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success', 'error', 'in_progress'
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 2. sharepoint_documents - Synced documents
CREATE TABLE public.sharepoint_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.sharepoint_config(id) ON DELETE CASCADE,
  sharepoint_item_id TEXT NOT NULL,
  sharepoint_drive_id TEXT,
  name TEXT NOT NULL,
  file_extension TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  web_url TEXT,
  download_url TEXT,
  folder_path TEXT NOT NULL DEFAULT '/',
  is_folder BOOLEAN NOT NULL DEFAULT false,
  sharepoint_modified_at TIMESTAMPTZ,
  sharepoint_modified_by TEXT,
  etag TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  UNIQUE(config_id, sharepoint_item_id)
);

-- 3. sharepoint_sync_logs - Sync history
CREATE TABLE public.sharepoint_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.sharepoint_config(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  items_found INTEGER NOT NULL DEFAULT 0,
  items_added INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_deleted INTEGER NOT NULL DEFAULT 0,
  delta_token_used TEXT,
  delta_token_new TEXT,
  error_message TEXT
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_sharepoint_documents_org ON public.sharepoint_documents(organization_id);
CREATE INDEX idx_sharepoint_documents_folder ON public.sharepoint_documents(config_id, folder_path) WHERE is_deleted = false;
CREATE INDEX idx_sharepoint_sync_logs_config ON public.sharepoint_sync_logs(config_id, started_at DESC);

-- =============================================
-- RLS Policies
-- =============================================

-- sharepoint_config RLS
ALTER TABLE public.sharepoint_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view SharePoint config"
  ON public.sharepoint_config FOR SELECT
  USING (user_belongs_to_organization(auth.uid(), organization_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can insert SharePoint config"
  ON public.sharepoint_config FOR INSERT
  WITH CHECK (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins can update SharePoint config"
  ON public.sharepoint_config FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins can delete SharePoint config"
  ON public.sharepoint_config FOR DELETE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR is_platform_admin(auth.uid())
  );

-- sharepoint_documents RLS
ALTER TABLE public.sharepoint_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view SharePoint documents"
  ON public.sharepoint_documents FOR SELECT
  USING (user_belongs_to_organization(auth.uid(), organization_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Service can manage SharePoint documents"
  ON public.sharepoint_documents FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- sharepoint_sync_logs RLS
ALTER TABLE public.sharepoint_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sync logs"
  ON public.sharepoint_sync_logs FOR SELECT
  USING (user_belongs_to_organization(auth.uid(), organization_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Service can manage sync logs"
  ON public.sharepoint_sync_logs FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- =============================================
-- Updated_at trigger
-- =============================================
CREATE TRIGGER update_sharepoint_config_updated_at
  BEFORE UPDATE ON public.sharepoint_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
