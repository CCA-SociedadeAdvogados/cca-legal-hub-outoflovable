-- Fix RLS policies on organization_document_checklist:
-- The previous policies used (SELECT email FROM auth.users WHERE id = auth.uid())
-- which fails with "permission denied for table users" because authenticated
-- users cannot query auth.users directly.
-- Replace with auth.email() which is a safe Supabase built-in.

-- Drop old policies
DROP POLICY IF EXISTS "organization_document_checklist_read" ON organization_document_checklist;
DROP POLICY IF EXISTS "organization_document_checklist_write" ON organization_document_checklist;

-- Recreate using auth.email()
CREATE POLICY "organization_document_checklist_read" ON organization_document_checklist
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM cca_internal_users WHERE email = auth.email()
    )
  );

CREATE POLICY "organization_document_checklist_write" ON organization_document_checklist
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM cca_internal_users WHERE email = auth.email()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM cca_internal_users WHERE email = auth.email()
    )
  );
