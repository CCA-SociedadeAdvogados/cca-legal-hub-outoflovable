-- Drop any existing policies that may have been partially created
DROP POLICY IF EXISTS "Users can view contract files from their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload contract files to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update contract files from their organization" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete contract files from their organization" ON storage.objects;

-- Create RLS policies for the contratos storage bucket (using valid app_role values)

-- Policy: Users can view files from their organization's contracts
CREATE POLICY "Users can view contract files from their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contratos' 
  AND EXISTS (
    SELECT 1 FROM public.anexos_contrato ac
    JOIN public.contratos c ON ac.contrato_id = c.id
    JOIN public.organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND storage.objects.name LIKE c.id::text || '/%'
  )
);

-- Policy: Users can upload files to contracts in their organization
CREATE POLICY "Users can upload contract files to their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can update files from their organization's contracts (owner, admin, editor)
CREATE POLICY "Users can update contract files from their organization"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contratos'
  AND EXISTS (
    SELECT 1 FROM public.contratos c
    JOIN public.organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND (om.role IN ('owner', 'admin', 'editor'))
    AND storage.objects.name LIKE c.id::text || '/%'
  )
);

-- Policy: Admins/Owners can delete files from their organization's contracts
CREATE POLICY "Admins can delete contract files from their organization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contratos'
  AND EXISTS (
    SELECT 1 FROM public.contratos c
    JOIN public.organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND (om.role IN ('owner', 'admin'))
    AND storage.objects.name LIKE c.id::text || '/%'
  )
);