-- Backfill user_departments from profiles.departamento
--
-- Problem: DepartmentGate and Onboarding wrote to profiles.departamento but NOT
-- to user_departments. The MeuDepartamento page reads from user_departments,
-- causing "Sem departamento atribuído" for users who completed onboarding.
--
-- Also: the assign_default_department trigger on organization_members only fires
-- on INSERT, not on UPSERT-as-UPDATE, so returning SSO users may be missing
-- their default "Geral" assignment.
--
-- Fix:
-- 1. Create department rows for each profiles.departamento enum value per org
-- 2. Insert user_departments entries for users who have profiles.departamento set
-- 3. Ensure all organization_members have the default "Geral" department

-- Step 1: Create department rows for each enum value used in profiles.departamento
-- (only for orgs that have members with that departamento)
INSERT INTO public.departments (organization_id, name, slug, is_default, is_system)
SELECT DISTINCT
  p.current_organization_id,
  CASE p.departamento
    WHEN 'juridico'   THEN 'Jurídico'
    WHEN 'comercial'  THEN 'Comercial'
    WHEN 'financeiro' THEN 'Financeiro'
    WHEN 'rh'         THEN 'Recursos Humanos'
    WHEN 'it'         THEN 'TI'
    WHEN 'operacoes'  THEN 'Operações'
    WHEN 'marketing'  THEN 'Marketing'
    WHEN 'outro'      THEN 'Outro'
    ELSE p.departamento::text
  END,
  p.departamento::text,
  false,
  false
FROM public.profiles p
WHERE p.departamento IS NOT NULL
  AND p.current_organization_id IS NOT NULL
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Step 2: Assign users to their selected department in user_departments
INSERT INTO public.user_departments (user_id, organization_id, department_id)
SELECT
  p.id,
  p.current_organization_id,
  d.id
FROM public.profiles p
JOIN public.departments d
  ON d.organization_id = p.current_organization_id
  AND d.slug = p.departamento::text
WHERE p.departamento IS NOT NULL
  AND p.current_organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id, department_id) DO NOTHING;

-- Step 3: Ensure all organization_members have the default "Geral" department
-- (catches users missed by the INSERT-only trigger)
INSERT INTO public.user_departments (user_id, organization_id, department_id)
SELECT om.user_id, om.organization_id, d.id
FROM public.organization_members om
JOIN public.departments d
  ON d.organization_id = om.organization_id
  AND d.is_default = true
ON CONFLICT (user_id, organization_id, department_id) DO NOTHING;
