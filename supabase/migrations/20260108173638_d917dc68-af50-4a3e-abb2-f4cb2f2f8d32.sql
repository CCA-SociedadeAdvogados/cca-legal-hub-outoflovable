-- Remove overly permissive RLS policies on anexos_contrato
-- These policies have USING(true) and WITH CHECK(true) which allow any authenticated user
-- to access attachments from any organization. Organization-scoped policies already exist.

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can insert attachments" ON anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON anexos_contrato;