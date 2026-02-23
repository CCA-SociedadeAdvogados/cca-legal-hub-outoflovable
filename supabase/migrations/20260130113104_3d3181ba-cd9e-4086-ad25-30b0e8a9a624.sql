-- Limpar políticas genéricas duplicadas que conflituam com as políticas por organização
DROP POLICY IF EXISTS "Authenticated users can upload contract files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract files" ON storage.objects;

-- As políticas específicas por organização já existem e são mantidas:
-- "Users can upload contract files to their organization"
-- "Users can update contract files in their organization"
-- "Users can delete contract files in their organization"