
-- ============================================================
-- Módulo de Utilizadores LegalHub — Migração Completa
-- ============================================================

-- 1. Tabela departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_id uuid REFERENCES public.profiles(id),
  UNIQUE (organization_id, slug)
);

-- 2. Tabela user_departments
CREATE TABLE IF NOT EXISTS public.user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_id uuid REFERENCES public.profiles(id),
  UNIQUE (user_id, organization_id, department_id)
);

-- 3. Coluna sso_group em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sso_group text;

-- 4. Colunas em impersonation_sessions para suportar impersonação de utilizador individual
ALTER TABLE public.impersonation_sessions 
  ADD COLUMN IF NOT EXISTS impersonated_user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS impersonated_user_name text;

-- Tornar impersonated_organization_id opcional (já pode ser null)
ALTER TABLE public.impersonation_sessions 
  ALTER COLUMN impersonated_organization_id DROP NOT NULL;

-- 5. Trigger: criar departamento "Geral" ao criar organização
CREATE OR REPLACE FUNCTION public.create_default_department()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.departments (organization_id, name, slug, is_default, is_system)
  VALUES (NEW.id, 'Geral', 'geral', true, true)
  ON CONFLICT (organization_id, slug) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_department();

-- 6. Trigger: associar novo membro ao departamento "Geral"
CREATE OR REPLACE FUNCTION public.assign_default_department()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dept_id uuid;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments
  WHERE organization_id = NEW.organization_id AND is_default = true LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    INSERT INTO public.user_departments (user_id, organization_id, department_id)
    VALUES (NEW.user_id, NEW.organization_id, v_dept_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_member_added ON public.organization_members;
CREATE TRIGGER on_member_added
  AFTER INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_department();

-- 7. Dados retroativos: criar "Geral" para todas as organizações existentes
INSERT INTO public.departments (organization_id, name, slug, is_default, is_system)
SELECT id, 'Geral', 'geral', true, true
FROM public.organizations
ON CONFLICT (organization_id, slug) DO NOTHING;

-- 8. Dados retroativos: associar todos os membros atuais ao "Geral"
INSERT INTO public.user_departments (user_id, organization_id, department_id)
SELECT om.user_id, om.organization_id, d.id
FROM public.organization_members om
JOIN public.departments d ON d.organization_id = om.organization_id AND d.is_default = true
ON CONFLICT DO NOTHING;

-- 9. RLS para departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view departments of their org or platform admin"
  ON public.departments FOR SELECT
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (
    get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role])
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can update departments"
  ON public.departments FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role])
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can delete non-system departments"
  ON public.departments FOR DELETE
  USING (
    is_system = false
    AND (
      get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role])
      OR is_platform_admin(auth.uid())
    )
  );

-- 10. RLS para user_departments
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view user_departments of their org or platform admin"
  ON public.user_departments FOR SELECT
  USING (
    user_belongs_to_organization(auth.uid(), organization_id)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can insert user_departments"
  ON public.user_departments FOR INSERT
  WITH CHECK (
    get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role])
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can delete user_departments"
  ON public.user_departments FOR DELETE
  USING (
    get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role])
    OR is_platform_admin(auth.uid())
  );

-- 11. Updated_at trigger para departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
