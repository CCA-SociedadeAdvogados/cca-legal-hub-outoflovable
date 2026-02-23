-- Remove overly permissive RLS policies that allow cross-organization access to contract attachments
-- The organization-scoped policies already provide proper access control

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can insert attachments" ON public.anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON public.anexos_contrato;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON public.anexos_contrato;