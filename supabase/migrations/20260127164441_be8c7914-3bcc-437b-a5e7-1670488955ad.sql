-- ===========================================
-- Fase 1: Extensão da tabela client_folders
-- ===========================================

-- Adicionar colunas para hierarquia e contexto de módulo
ALTER TABLE public.client_folders
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.client_folders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'GERAL',
ADD COLUMN IF NOT EXISTS path uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by_id uuid REFERENCES public.profiles(id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_client_folders_org_module_parent 
ON public.client_folders(organization_id, module, parent_id);

CREATE INDEX IF NOT EXISTS idx_client_folders_updated_at 
ON public.client_folders(updated_at);

CREATE INDEX IF NOT EXISTS idx_client_folders_parent_id 
ON public.client_folders(parent_id);

-- ===========================================
-- Fase 2: Criar tabela folder_items
-- ===========================================

CREATE TABLE IF NOT EXISTS public.folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.client_folders(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by_id uuid REFERENCES public.profiles(id),
  CONSTRAINT folder_items_unique_item UNIQUE (folder_id, item_type, item_id)
);

-- Criar índices para folder_items
CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id 
ON public.folder_items(folder_id);

CREATE INDEX IF NOT EXISTS idx_folder_items_item 
ON public.folder_items(item_type, item_id);

-- ===========================================
-- Fase 3: RLS para folder_items
-- ===========================================

ALTER TABLE public.folder_items ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da organização podem ver items das suas pastas
CREATE POLICY "View folder items for org members"
ON public.folder_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_folders cf
    WHERE cf.id = folder_items.folder_id
    AND user_belongs_to_organization(auth.uid(), cf.organization_id)
  )
);

-- INSERT: editors+ podem adicionar items às pastas
CREATE POLICY "Editors can add items to folders"
ON public.folder_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_folders cf
    JOIN public.organization_members om ON om.organization_id = cf.organization_id
    WHERE cf.id = folder_items.folder_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- UPDATE: editors+ podem atualizar items das pastas
CREATE POLICY "Editors can update folder items"
ON public.folder_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_folders cf
    JOIN public.organization_members om ON om.organization_id = cf.organization_id
    WHERE cf.id = folder_items.folder_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- DELETE: admins+ podem remover items das pastas
CREATE POLICY "Admins can delete folder items"
ON public.folder_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_folders cf
    JOIN public.organization_members om ON om.organization_id = cf.organization_id
    WHERE cf.id = folder_items.folder_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- ===========================================
-- Fase 4: Atualizar RLS de client_folders para editors
-- ===========================================

-- Adicionar política de INSERT para editors
CREATE POLICY "Editors can create folders"
ON public.client_folders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = client_folders.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- Adicionar política de UPDATE para editors
CREATE POLICY "Editors can update folders"
ON public.client_folders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = client_folders.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- Adicionar política de DELETE para admins
CREATE POLICY "Admins can delete folders"
ON public.client_folders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = client_folders.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);