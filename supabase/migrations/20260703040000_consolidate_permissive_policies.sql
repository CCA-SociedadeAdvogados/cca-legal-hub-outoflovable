-- Performance RLS: consolidar múltiplas políticas PERMISSIVE por (tabela, ação)
-- numa só (advisor multiple_permissive_policies). O PostgreSQL já avalia as
-- políticas permissivas como OR; juntar USING (a OR b) e WITH CHECK (checkA OR
-- checkB) é equivalente, mas evita reavaliar várias políticas por linha.
--
-- Regras aplicadas (preservam a semântica exatamente):
--  - USING     = OR dos USING originais (todas as ações exceto INSERT)
--  - WITH CHECK = OR de coalesce(with_check, qual) para UPDATE/ALL; OR dos
--                 with_check para INSERT (nunca fica mais restritivo)
--  - role      = 'public' se algum original era public (mais abrangente,
--                 nunca remove acesso; os predicados exigem auth.uid())
-- Gerado a partir das expressões exatas de pg_policies.

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS briefing_audit_select ON public.audit_logs;
CREATE POLICY "audit_logs_select_merged" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public USING ((((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (get_user_org_role(( SELECT auth.uid() AS uid), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))) OR ((is_platform_admin() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'org_user'::text]))))));
DROP POLICY IF EXISTS "Admins can view all auth logs" ON public.auth_activity_logs;
DROP POLICY IF EXISTS "Users can view their own auth logs" ON public.auth_activity_logs;
CREATE POLICY "auth_activity_logs_select_merged" ON public.auth_activity_logs AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (organization_members om
     JOIN profiles p ON ((p.id = ( SELECT auth.uid() AS uid))))
  WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = p.current_organization_id) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))) OR ((user_id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "Service role can manage bc config" ON public.bc_config;
DROP POLICY IF EXISTS "Platform admins can manage bc config" ON public.bc_config;
CREATE POLICY "bc_config_all_merged" ON public.bc_config AS PERMISSIVE FOR ALL TO public USING (((( SELECT auth.role() AS role) = 'service_role'::text)) OR (is_platform_admin())) WITH CHECK (((( SELECT auth.role() AS role) = 'service_role'::text)) OR (is_platform_admin()));
DROP POLICY IF EXISTS briefing_content_blocks_all ON public.client_content_blocks;
DROP POLICY IF EXISTS "Admins can manage content blocks" ON public.client_content_blocks;
CREATE POLICY "client_content_blocks_all_merged" ON public.client_content_blocks AS PERMISSIVE FOR ALL TO public USING (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))) OR (is_platform_admin(( SELECT auth.uid() AS uid)))) WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))) OR (is_platform_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS briefing_content_blocks_select ON public.client_content_blocks;
DROP POLICY IF EXISTS "Members can read content blocks" ON public.client_content_blocks;
CREATE POLICY "client_content_blocks_select_merged" ON public.client_content_blocks AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id))) OR ((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Admins can delete folders" ON public.client_folders;
DROP POLICY IF EXISTS briefing_folders_delete ON public.client_folders;
CREATE POLICY "client_folders_delete_merged" ON public.client_folders AS PERMISSIVE FOR DELETE TO public USING (((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))));
DROP POLICY IF EXISTS "Editors can create folders" ON public.client_folders;
DROP POLICY IF EXISTS briefing_folders_insert ON public.client_folders;
CREATE POLICY "client_folders_insert_merged" ON public.client_folders AS PERMISSIVE FOR INSERT TO public WITH CHECK (((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])))))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))));
DROP POLICY IF EXISTS briefing_folders_select ON public.client_folders;
DROP POLICY IF EXISTS "View folders for org members or platform admin" ON public.client_folders;
CREATE POLICY "client_folders_select_merged" ON public.client_folders AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = ANY (ARRAY['org_user'::text, 'org_manager'::text]))))) OR ((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Editors can update folders" ON public.client_folders;
DROP POLICY IF EXISTS briefing_folders_update ON public.client_folders;
CREATE POLICY "client_folders_update_merged" ON public.client_folders AS PERMISSIVE FOR UPDATE TO public USING (((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])))))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])))))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))));
DROP POLICY IF EXISTS briefing_home_config_all ON public.client_home_config;
DROP POLICY IF EXISTS "Admins can manage home config" ON public.client_home_config;
CREATE POLICY "client_home_config_all_merged" ON public.client_home_config AS PERMISSIVE FOR ALL TO public USING (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))) OR (is_platform_admin(( SELECT auth.uid() AS uid)))) WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))) OR (is_platform_admin(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS briefing_home_config_select ON public.client_home_config;
DROP POLICY IF EXISTS "Members can read home config" ON public.client_home_config;
CREATE POLICY "client_home_config_select_merged" ON public.client_home_config AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id))) OR ((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Editors and above can view compliance analyses" ON public.contract_compliance_analyses;
DROP POLICY IF EXISTS "Users can view compliance analyses for their org" ON public.contract_compliance_analyses;
CREATE POLICY "contract_compliance_analyses_select_merged" ON public.contract_compliance_analyses AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin(( SELECT auth.uid() AS uid)) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (get_user_org_role(( SELECT auth.uid() AS uid), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))) OR ((is_platform_admin(( SELECT auth.uid() AS uid)) OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contratos;
DROP POLICY IF EXISTS briefing_contratos_delete ON public.contratos;
CREATE POLICY "contratos_delete_merged" ON public.contratos AS PERMISSIVE FOR DELETE TO public USING ((((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (get_user_org_role(( SELECT auth.uid() AS uid), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))));
DROP POLICY IF EXISTS "Editors can insert contracts" ON public.contratos;
DROP POLICY IF EXISTS briefing_contratos_insert ON public.contratos;
CREATE POLICY "contratos_insert_merged" ON public.contratos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Users can view contracts in their organization or platform admi" ON public.contratos;
DROP POLICY IF EXISTS "SSO CCA users can view contracts in all organizations" ON public.contratos;
DROP POLICY IF EXISTS briefing_contratos_select ON public.contratos;
CREATE POLICY "contratos_select_merged" ON public.contratos AS PERMISSIVE FOR SELECT TO public USING ((((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.auth_method = 'sso_cca'::text))))) OR ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_manager'::text) AND ((departamento_responsavel)::text = ( SELECT d.slug
   FROM (departments d
     JOIN user_departments ud ON ((ud.department_id = d.id)))
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.organization_id = contratos.organization_id))
 LIMIT 1))))));
DROP POLICY IF EXISTS briefing_contratos_update ON public.contratos;
DROP POLICY IF EXISTS "Editors can update contracts" ON public.contratos;
CREATE POLICY "contratos_update_merged" ON public.contratos AS PERMISSIVE FOR UPDATE TO public USING (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_docs_insert ON public.documentos_gerados;
DROP POLICY IF EXISTS "Editors can insert documentos" ON public.documentos_gerados;
CREATE POLICY "documentos_gerados_insert_merged" ON public.documentos_gerados AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_docs_select ON public.documentos_gerados;
DROP POLICY IF EXISTS "Users can view documentos in their organization" ON public.documentos_gerados;
CREATE POLICY "documentos_gerados_select_merged" ON public.documentos_gerados AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_docs_update ON public.documentos_gerados;
DROP POLICY IF EXISTS "Editors can update documentos" ON public.documentos_gerados;
CREATE POLICY "documentos_gerados_update_merged" ON public.documentos_gerados AS PERMISSIVE FOR UPDATE TO public USING (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK (((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS eventos_legislativos_delete ON public.eventos_legislativos;
DROP POLICY IF EXISTS "Admins can delete eventos" ON public.eventos_legislativos;
CREATE POLICY "eventos_legislativos_delete_merged" ON public.eventos_legislativos AS PERMISSIVE FOR DELETE TO public USING ((((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT auth.uid() AS uid)))) OR fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS eventos_legislativos_insert ON public.eventos_legislativos;
DROP POLICY IF EXISTS briefing_eventos_insert ON public.eventos_legislativos;
DROP POLICY IF EXISTS "Editors can insert eventos" ON public.eventos_legislativos;
CREATE POLICY "eventos_legislativos_insert_merged" ON public.eventos_legislativos AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT auth.uid() AS uid)))) OR fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid)))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS eventos_legislativos_select ON public.eventos_legislativos;
DROP POLICY IF EXISTS briefing_eventos_select ON public.eventos_legislativos;
DROP POLICY IF EXISTS "Users can view eventos in their organization" ON public.eventos_legislativos;
CREATE POLICY "eventos_legislativos_select_merged" ON public.eventos_legislativos AS PERMISSIVE FOR SELECT TO public USING ((((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT auth.uid() AS uid)))) OR fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid)))) OR ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS eventos_legislativos_update ON public.eventos_legislativos;
DROP POLICY IF EXISTS briefing_eventos_update ON public.eventos_legislativos;
DROP POLICY IF EXISTS "Editors can update eventos" ON public.eventos_legislativos;
CREATE POLICY "eventos_legislativos_update_merged" ON public.eventos_legislativos AS PERMISSIVE FOR UPDATE TO public USING ((((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT auth.uid() AS uid)))) OR fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid)))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK ((((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = ( SELECT auth.uid() AS uid)))) OR fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid)))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON public.feature_flags;
DROP POLICY IF EXISTS "Feature flags are readable by everyone" ON public.feature_flags;
CREATE POLICY "feature_flags_select_merged" ON public.feature_flags AS PERMISSIVE FOR SELECT TO public USING ((true));
DROP POLICY IF EXISTS "Editors can insert impactos" ON public.impactos;
DROP POLICY IF EXISTS briefing_impactos_insert ON public.impactos;
CREATE POLICY "impactos_insert_merged" ON public.impactos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_impactos_select ON public.impactos;
DROP POLICY IF EXISTS "Users can view impactos in their organization" ON public.impactos;
CREATE POLICY "impactos_select_merged" ON public.impactos AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;
DROP POLICY IF EXISTS briefing_notifications_insert ON public.notifications;
CREATE POLICY "notifications_insert_merged" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) IS NOT NULL))) OR ((is_platform_admin() OR is_cca_user() OR (user_id = ( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS briefing_notifications_select ON public.notifications;
CREATE POLICY "notifications_select_merged" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = user_id)) OR (((user_id = ( SELECT auth.uid() AS uid)) OR is_platform_admin())));
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS briefing_notifications_update ON public.notifications;
CREATE POLICY "notifications_update_merged" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT auth.uid() AS uid) = user_id)) OR ((user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id)) OR ((user_id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS briefing_om_select ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations or platform admin" ON public.organization_members;
CREATE POLICY "organization_members_select_merged" ON public.organization_members AS PERMISSIVE FOR SELECT TO authenticated USING (((is_platform_admin() OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_manager'::text) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = organization_members.user_id) AND (ud.organization_id = organization_members.organization_id) AND (ud.department_id = my_department_in_org(ud.organization_id)))))) OR (is_cca_user() AND (organization_id = get_cca_org_id())) OR (user_id = ( SELECT auth.uid() AS uid)))) OR ((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "CCA users read all organizations" ON public.organizations;
DROP POLICY IF EXISTS organizations_read_access ON public.organizations;
DROP POLICY IF EXISTS "CCA internal can view all organizations" ON public.organizations;
CREATE POLICY "organizations_select_merged" ON public.organizations AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.auth_method = 'sso_cca'::text))))) OR ((is_platform_admin(( SELECT auth.uid() AS uid)) OR is_cca_user(( SELECT auth.uid() AS uid)) OR user_belongs_to_organization(( SELECT auth.uid() AS uid), id))) OR (fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "CCA users read all" ON public.organizations_legacy;
DROP POLICY IF EXISTS "CCA internal users can read organizations_legacy" ON public.organizations_legacy;
CREATE POLICY "organizations_legacy_select_merged" ON public.organizations_legacy AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM platform_users pu
  WHERE ((pu.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (pu.role = ANY (ARRAY['app_admin'::text, 'cca_manager'::text, 'cca_user'::text])))))) OR (fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS briefing_politicas_insert ON public.politicas;
DROP POLICY IF EXISTS "Editors can insert politicas" ON public.politicas;
CREATE POLICY "politicas_insert_merged" ON public.politicas AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_politicas_select ON public.politicas;
DROP POLICY IF EXISTS "Users can view politicas in their organization" ON public.politicas;
CREATE POLICY "politicas_select_merged" ON public.politicas AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_politicas_update ON public.politicas;
DROP POLICY IF EXISTS "Editors can update politicas" ON public.politicas;
CREATE POLICY "politicas_update_merged" ON public.politicas AS PERMISSIVE FOR UPDATE TO public USING (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Members can view profiles of same organization" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "profiles_select_merged" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (organization_members om1
     JOIN organization_members om2 ON ((om1.organization_id = om2.organization_id)))
  WHERE ((om1.user_id = ( SELECT auth.uid() AS uid)) AND (om2.user_id = profiles.id)))) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR (((id = ( SELECT auth.uid() AS uid)) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR ((id = ( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS briefing_requisitos_insert ON public.requisitos;
DROP POLICY IF EXISTS "Editors can insert requisitos" ON public.requisitos;
CREATE POLICY "requisitos_insert_merged" ON public.requisitos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_requisitos_select ON public.requisitos;
DROP POLICY IF EXISTS "Users can view requisitos in their organization" ON public.requisitos;
CREATE POLICY "requisitos_select_merged" ON public.requisitos AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_requisitos_update ON public.requisitos;
DROP POLICY IF EXISTS "Editors can update requisitos" ON public.requisitos;
CREATE POLICY "requisitos_update_merged" ON public.requisitos AS PERMISSIVE FOR UPDATE TO public USING (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Members can view SharePoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "CCA internal can view all SharePoint configs" ON public.sharepoint_config;
CREATE POLICY "sharepoint_config_select_merged" ON public.sharepoint_config AS PERMISSIVE FOR SELECT TO public USING (((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR (fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "Members can view SharePoint documents" ON public.sharepoint_documents;
DROP POLICY IF EXISTS "CCA internal can view all SharePoint documents" ON public.sharepoint_documents;
CREATE POLICY "sharepoint_documents_select_merged" ON public.sharepoint_documents AS PERMISSIVE FOR SELECT TO public USING (((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR (fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "Members can view sync logs" ON public.sharepoint_sync_logs;
DROP POLICY IF EXISTS "CCA internal can view all SharePoint sync logs" ON public.sharepoint_sync_logs;
CREATE POLICY "sharepoint_sync_logs_select_merged" ON public.sharepoint_sync_logs AS PERMISSIVE FOR SELECT TO public USING (((user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR (fn_is_cca_internal_authorized(( SELECT auth.uid() AS uid))));
DROP POLICY IF EXISTS "Admins can delete templates" ON public.templates;
DROP POLICY IF EXISTS briefing_templates_delete ON public.templates;
CREATE POLICY "templates_delete_merged" ON public.templates AS PERMISSIVE FOR DELETE TO public USING ((((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (get_user_org_role(( SELECT auth.uid() AS uid), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))) OR ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text])))));
DROP POLICY IF EXISTS "Editors can insert templates" ON public.templates;
DROP POLICY IF EXISTS briefing_templates_insert ON public.templates;
CREATE POLICY "templates_insert_merged" ON public.templates AS PERMISSIVE FOR INSERT TO public WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_templates_select ON public.templates;
DROP POLICY IF EXISTS "Users can view templates in their organization" ON public.templates;
CREATE POLICY "templates_select_merged" ON public.templates AS PERMISSIVE FOR SELECT TO public USING (((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS briefing_templates_update ON public.templates;
DROP POLICY IF EXISTS "Editors can update templates" ON public.templates;
CREATE POLICY "templates_update_merged" ON public.templates AS PERMISSIVE FOR UPDATE TO public USING (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))))) WITH CHECK (((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)))) OR ((organization_id = get_user_organization_id(( SELECT auth.uid() AS uid)))));
DROP POLICY IF EXISTS "Users can insert their own user_departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admins and owners can insert user_departments" ON public.user_departments;
CREATE POLICY "user_departments_insert_merged" ON public.user_departments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((get_user_org_role(( SELECT auth.uid() AS uid), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin(( SELECT auth.uid() AS uid)))) OR (((user_id = ( SELECT auth.uid() AS uid)) AND user_belongs_to_organization(( SELECT auth.uid() AS uid), organization_id))));
