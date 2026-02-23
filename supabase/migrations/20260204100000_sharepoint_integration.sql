-- =====================================================
-- SharePoint Integration Tables
-- Sincronização em tempo real com Microsoft SharePoint
-- =====================================================

-- Tabela de configuração do SharePoint por organização
CREATE TABLE IF NOT EXISTS public.sharepoint_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id TEXT NOT NULL,
    site_name TEXT,
    site_url TEXT,
    drive_id TEXT, -- ID do drive/biblioteca de documentos
    root_folder_path TEXT DEFAULT '/', -- Pasta raiz para sincronizar
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 5,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'in_progress')),
    last_sync_error TEXT,
    last_delta_token TEXT, -- Token para sincronização delta (apenas mudanças)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id)
);

-- Tabela de documentos sincronizados do SharePoint
CREATE TABLE IF NOT EXISTS public.sharepoint_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES public.sharepoint_config(id) ON DELETE CASCADE,

    -- Identificadores do SharePoint
    sharepoint_item_id TEXT NOT NULL, -- ID único do item no SharePoint
    sharepoint_drive_id TEXT NOT NULL,
    sharepoint_parent_id TEXT, -- ID da pasta pai no SharePoint

    -- Metadados do ficheiro
    name TEXT NOT NULL,
    file_extension TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    web_url TEXT, -- URL para abrir no SharePoint
    download_url TEXT, -- URL de download (expira)

    -- Estrutura de pastas
    folder_path TEXT NOT NULL, -- Caminho completo da pasta (ex: /Contratos/Cliente A)
    is_folder BOOLEAN DEFAULT false,

    -- Sincronização
    sharepoint_created_at TIMESTAMPTZ,
    sharepoint_modified_at TIMESTAMPTZ,
    sharepoint_created_by TEXT,
    sharepoint_modified_by TEXT,
    etag TEXT, -- Para detetar mudanças

    -- Mapeamento local
    local_folder_id UUID REFERENCES public.client_folders(id) ON DELETE SET NULL,

    -- Controle
    synced_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false, -- Soft delete quando removido do SharePoint
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Índices únicos
    UNIQUE(config_id, sharepoint_item_id)
);

-- Tabela de log de sincronização
CREATE TABLE IF NOT EXISTS public.sharepoint_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.sharepoint_config(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',

    -- Estatísticas
    items_found INTEGER DEFAULT 0,
    items_added INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,

    -- Erros
    error_message TEXT,
    error_details JSONB,

    -- Delta token usado/gerado
    delta_token_used TEXT,
    delta_token_new TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sharepoint_documents_org ON public.sharepoint_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_documents_config ON public.sharepoint_documents(config_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_documents_folder_path ON public.sharepoint_documents(folder_path);
CREATE INDEX IF NOT EXISTS idx_sharepoint_documents_name ON public.sharepoint_documents(name);
CREATE INDEX IF NOT EXISTS idx_sharepoint_documents_not_deleted ON public.sharepoint_documents(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_logs_config ON public.sharepoint_sync_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_logs_started ON public.sharepoint_sync_logs(started_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_sharepoint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sharepoint_config_updated_at
    BEFORE UPDATE ON public.sharepoint_config
    FOR EACH ROW
    EXECUTE FUNCTION update_sharepoint_updated_at();

CREATE TRIGGER trigger_sharepoint_documents_updated_at
    BEFORE UPDATE ON public.sharepoint_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_sharepoint_updated_at();

-- RLS Policies
ALTER TABLE public.sharepoint_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharepoint_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharepoint_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para sharepoint_config
CREATE POLICY "Users can view their org sharepoint config"
    ON public.sharepoint_config FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage sharepoint config"
    ON public.sharepoint_config FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Políticas para sharepoint_documents
CREATE POLICY "Users can view their org sharepoint documents"
    ON public.sharepoint_documents FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage sharepoint documents"
    ON public.sharepoint_documents FOR ALL
    USING (true)
    WITH CHECK (true);

-- Políticas para sharepoint_sync_logs
CREATE POLICY "Users can view their org sync logs"
    ON public.sharepoint_sync_logs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage sync logs"
    ON public.sharepoint_sync_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Função para obter documentos de uma pasta
CREATE OR REPLACE FUNCTION get_sharepoint_folder_contents(
    p_organization_id UUID,
    p_folder_path TEXT DEFAULT '/'
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    is_folder BOOLEAN,
    file_extension TEXT,
    size_bytes BIGINT,
    web_url TEXT,
    folder_path TEXT,
    sharepoint_modified_at TIMESTAMPTZ,
    sharepoint_modified_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.name,
        d.is_folder,
        d.file_extension,
        d.size_bytes,
        d.web_url,
        d.folder_path,
        d.sharepoint_modified_at,
        d.sharepoint_modified_by
    FROM public.sharepoint_documents d
    WHERE d.organization_id = p_organization_id
      AND d.is_deleted = false
      AND (
          -- Ficheiros na pasta especificada
          (d.folder_path = p_folder_path AND d.is_folder = false)
          OR
          -- Subpastas diretas
          (d.is_folder = true AND d.folder_path LIKE p_folder_path || '%'
           AND d.folder_path != p_folder_path
           AND position('/' in substring(d.folder_path from length(p_folder_path) + 2)) = 0)
      )
    ORDER BY d.is_folder DESC, d.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE public.sharepoint_config IS 'Configuração da integração SharePoint por organização';
COMMENT ON TABLE public.sharepoint_documents IS 'Documentos sincronizados do SharePoint';
COMMENT ON TABLE public.sharepoint_sync_logs IS 'Histórico de sincronizações com SharePoint';
COMMENT ON COLUMN public.sharepoint_config.last_delta_token IS 'Token para sincronização incremental - apenas busca mudanças desde a última sync';
COMMENT ON COLUMN public.sharepoint_documents.etag IS 'ETag do SharePoint para detetar modificações';
