-- ============================================================
-- Garantir que o bucket "contratos" existe com as definições corretas
-- Suporta PDF, Word (doc/docx) e TXT
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos',
  'contratos',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Remover políticas antigas para recriar de forma limpa
-- ============================================================

DROP POLICY IF EXISTS "Users can upload contract files to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can view contract files from their organization"  ON storage.objects;
DROP POLICY IF EXISTS "Users can update contract files from their organization" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete contract files from their organization" ON storage.objects;

-- ============================================================
-- INSERT: utilizadores autenticados podem carregar ficheiros
--  • temp/<uuid>/<ficheiro>  – carregamentos temporários (antes de ter contrato)
--  • <contrato_id>/<ficheiro> – ficheiros ligados a um contrato existente
-- ============================================================
CREATE POLICY "contratos_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
  AND (
    -- Pasta temporária: qualquer utilizador autenticado
    name LIKE 'temp/%'
    OR
    -- Pasta do contrato: utilizador tem papel editor/admin/owner na org
    EXISTS (
      SELECT 1
      FROM public.contratos c
      JOIN public.organization_members om
        ON c.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
        AND name LIKE c.id::text || '/%'
    )
  )
);

-- ============================================================
-- SELECT: utilizadores podem ver os seus ficheiros temporários
--         e os ficheiros dos contratos da sua organização
-- ============================================================
CREATE POLICY "contratos_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE 'temp/%'
    OR
    EXISTS (
      SELECT 1
      FROM public.anexos_contrato ac
      JOIN public.contratos c ON ac.contrato_id = c.id
      JOIN public.organization_members om
        ON c.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND storage.objects.name LIKE c.id::text || '/%'
    )
  )
);

-- ============================================================
-- DELETE: utilizadores podem eliminar ficheiros temporários
--         e ficheiros de contratos onde têm permissão
-- ============================================================
CREATE POLICY "contratos_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
  AND (
    name LIKE 'temp/%'
    OR
    EXISTS (
      SELECT 1
      FROM public.contratos c
      JOIN public.organization_members om
        ON c.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
        AND storage.objects.name LIKE c.id::text || '/%'
    )
  )
);
