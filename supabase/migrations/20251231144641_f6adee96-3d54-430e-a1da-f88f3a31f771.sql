-- Fix weak storage upload policy for contratos bucket
-- The current policy only checks authentication, not organization membership

-- Drop the existing weak INSERT policy
DROP POLICY IF EXISTS "Users can upload contract files to their organization" ON storage.objects;

-- Create a proper INSERT policy that validates organization membership and role
CREATE POLICY "Users can upload contract files to their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.contratos c
    JOIN public.organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
    -- Extract contract ID from storage path (format: contract-uuid/filename)
    AND name LIKE c.id::text || '/%'
  )
);