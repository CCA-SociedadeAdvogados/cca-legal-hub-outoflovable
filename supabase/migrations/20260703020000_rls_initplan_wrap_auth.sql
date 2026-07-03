-- Performance RLS: embrulhar chamadas auth.*() em (select auth.*()) para que
-- o Postgres as avalie uma vez por statement (initPlan) em vez de por linha.
-- Corrige o advisor auth_rls_initplan sem alterar a semântica das políticas.
-- Gerado a partir de pg_policies (ALTER POLICY preserva roles/cmd/permissive).

ALTER POLICY alert_rules_insert ON public.alert_rules WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY alert_rules_select ON public.alert_rules USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY alert_rules_update ON public.alert_rules USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can delete contract attachments in their organization" ON public.anexos_contrato USING ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))))));
ALTER POLICY "Users can insert contract attachments in their organization" ON public.anexos_contrato WITH CHECK ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "Users can update contract attachments in their organization" ON public.anexos_contrato USING ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "Users can view contract attachments in their organization" ON public.anexos_contrato USING ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = (select auth.uid()))))));
ALTER POLICY ae_cca_write ON public.assunto_eventos USING ((is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid())))) WITH CHECK ((is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY ae_select ON public.assunto_eventos USING (((visivel_cliente AND (organization_id = get_user_organization_id((select auth.uid())))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY assuntos_cca_write ON public.assuntos USING ((is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid())))) WITH CHECK ((is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY assuntos_select ON public.assuntos USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins can view audit logs" ON public.audit_logs USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Authenticated users can insert audit logs" ON public.audit_logs WITH CHECK (((select auth.uid()) IS NOT NULL));
ALTER POLICY briefing_audit_select ON public.audit_logs USING ((is_platform_admin() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'org_user'::text])))));
ALTER POLICY "Admins can view all auth logs" ON public.auth_activity_logs USING ((EXISTS ( SELECT 1
   FROM (organization_members om
     JOIN profiles p ON ((p.id = (select auth.uid()))))
  WHERE ((om.user_id = (select auth.uid())) AND (om.organization_id = p.current_organization_id) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))))));
ALTER POLICY "Authenticated users can insert auth logs" ON public.auth_activity_logs WITH CHECK ((((select auth.uid()) IS NOT NULL) OR (user_id IS NULL)));
ALTER POLICY "Users can view their own auth logs" ON public.auth_activity_logs USING ((user_id = (select auth.uid())));
ALTER POLICY "Org members can view bc accounts" ON public.bc_accounts USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin()));
ALTER POLICY "Service role can manage bc accounts" ON public.bc_accounts USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Org members can view bc config" ON public.bc_config USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin()));
ALTER POLICY "Service role can manage bc config" ON public.bc_config USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Org members can view bc customers" ON public.bc_customers USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin()));
ALTER POLICY "Service role can manage bc customers" ON public.bc_customers USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Org members can view bc ledger" ON public.bc_ledger USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin()));
ALTER POLICY "Service role can manage bc ledger" ON public.bc_ledger USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Org members can view bc sync logs" ON public.bc_sync_logs USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin()));
ALTER POLICY "Service role can manage bc sync logs" ON public.bc_sync_logs USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Platform admins can manage cca_internal_users" ON public.cca_internal_users USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can delete news" ON public.cca_news USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can insert news" ON public.cca_news WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can update news" ON public.cca_news USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Read published news or all for platform admins" ON public.cca_news USING (((estado = 'publicado'::text) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins can manage content blocks" ON public.client_content_blocks USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Members can read content blocks" ON public.client_content_blocks USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY briefing_content_blocks_select ON public.client_content_blocks USING ((is_platform_admin() OR is_cca_user() OR user_belongs_to_organization((select auth.uid()), organization_id)));
ALTER POLICY "Admins can delete folders" ON public.client_folders USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))))));
ALTER POLICY "Editors can create folders" ON public.client_folders WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "Editors can update folders" ON public.client_folders USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = client_folders.organization_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "View folders for org members or platform admin" ON public.client_folders USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY briefing_folders_insert ON public.client_folders WITH CHECK ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY briefing_folders_select ON public.client_folders USING ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = ANY (ARRAY['org_user'::text, 'org_manager'::text])))));
ALTER POLICY briefing_folders_update ON public.client_folders USING ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY "Admins can manage home config" ON public.client_home_config USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Members can read home config" ON public.client_home_config USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY briefing_home_config_select ON public.client_home_config USING ((is_platform_admin() OR is_cca_user() OR user_belongs_to_organization((select auth.uid()), organization_id)));
ALTER POLICY internal_read_diffs ON public.contract_ai_diffs USING ((EXISTS ( SELECT 1
   FROM auth.users u
  WHERE ((u.id = (select auth.uid())) AND ((u.raw_user_meta_data ->> 'role'::text) = 'internal'::text)))));
ALTER POLICY internal_read_audit ON public.contract_audit_log USING ((EXISTS ( SELECT 1
   FROM auth.users u
  WHERE ((u.id = (select auth.uid())) AND ((u.raw_user_meta_data ->> 'role'::text) = 'internal'::text)))));
ALTER POLICY "Admins can delete compliance analyses" ON public.contract_compliance_analyses USING ((is_platform_admin((select auth.uid())) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))));
ALTER POLICY "Editors and above can view compliance analyses" ON public.contract_compliance_analyses USING ((is_platform_admin((select auth.uid())) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])))));
ALTER POLICY "Users can insert compliance analyses for their org" ON public.contract_compliance_analyses WITH CHECK ((is_platform_admin((select auth.uid())) OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY "Users can update compliance analyses for their org" ON public.contract_compliance_analyses USING ((is_platform_admin((select auth.uid())) OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY "Users can view compliance analyses for their org" ON public.contract_compliance_analyses USING ((is_platform_admin((select auth.uid())) OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY ce_delete ON public.contract_extractions USING ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contract_extractions.contrato_id) AND (is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
           FROM (organization_members _om
             JOIN organizations _o ON ((_o.id = _om.organization_id)))
          WHERE ((_om.user_id = (select auth.uid())) AND (_o.org_type = 'cca_owner'::text)))) OR (c.organization_id = get_user_organization_id((select auth.uid()))))))));
ALTER POLICY ce_insert ON public.contract_extractions WITH CHECK ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contract_extractions.contrato_id) AND (is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
           FROM (organization_members _om
             JOIN organizations _o ON ((_o.id = _om.organization_id)))
          WHERE ((_om.user_id = (select auth.uid())) AND (_o.org_type = 'cca_owner'::text)))) OR (c.organization_id = get_user_organization_id((select auth.uid()))))))));
ALTER POLICY ce_select ON public.contract_extractions USING ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contract_extractions.contrato_id) AND (is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
           FROM (organization_members _om
             JOIN organizations _o ON ((_o.id = _om.organization_id)))
          WHERE ((_om.user_id = (select auth.uid())) AND (_o.org_type = 'cca_owner'::text)))) OR (c.organization_id = get_user_organization_id((select auth.uid()))))))));
ALTER POLICY ce_update ON public.contract_extractions USING ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contract_extractions.contrato_id) AND (is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
           FROM (organization_members _om
             JOIN organizations _o ON ((_o.id = _om.organization_id)))
          WHERE ((_om.user_id = (select auth.uid())) AND (_o.org_type = 'cca_owner'::text)))) OR (c.organization_id = get_user_organization_id((select auth.uid())))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contract_extractions.contrato_id) AND (is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
           FROM (organization_members _om
             JOIN organizations _o ON ((_o.id = _om.organization_id)))
          WHERE ((_om.user_id = (select auth.uid())) AND (_o.org_type = 'cca_owner'::text)))) OR (c.organization_id = get_user_organization_id((select auth.uid()))))))));
ALTER POLICY "Editors can delete contract legislation" ON public.contrato_normativos USING ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contrato_normativos.contrato_id) AND (c.organization_id = get_user_organization_id((select auth.uid())))))));
ALTER POLICY "Editors can insert contract legislation" ON public.contrato_normativos WITH CHECK ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contrato_normativos.contrato_id) AND (c.organization_id = get_user_organization_id((select auth.uid())))))));
ALTER POLICY "Users can view contract legislation in their organization" ON public.contrato_normativos USING ((EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.id = contrato_normativos.contrato_id) AND (c.organization_id = get_user_organization_id((select auth.uid())))))));
ALTER POLICY "Admins can delete contracts" ON public.contratos USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Editors can insert contracts" ON public.contratos WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update contracts" ON public.contratos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "SSO CCA users can view contracts in all organizations" ON public.contratos USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.auth_method = 'sso_cca'::text)))));
ALTER POLICY "Users can view contracts in their organization or platform admi" ON public.contratos USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_platform_admin((select auth.uid()))));
ALTER POLICY briefing_contratos_insert ON public.contratos WITH CHECK ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY briefing_contratos_select ON public.contratos USING ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_manager'::text) AND ((departamento_responsavel)::text = ( SELECT d.slug
   FROM (departments d
     JOIN user_departments ud ON ((ud.department_id = d.id)))
  WHERE ((ud.user_id = (select auth.uid())) AND (ud.organization_id = contratos.organization_id))
 LIMIT 1)))));
ALTER POLICY briefing_contratos_update ON public.contratos USING ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY "Platform admins can view retention policies" ON public.data_retention_policies USING ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))));
ALTER POLICY "Admins and owners can delete non-system departments" ON public.departments USING (((is_system = false) AND ((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid())))));
ALTER POLICY "Admins and owners can insert departments" ON public.departments WITH CHECK (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins and owners can update departments" ON public.departments USING (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Members can view departments of their org or platform admin" ON public.departments USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins can delete documentos" ON public.documentos_gerados USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Editors can insert documentos" ON public.documentos_gerados WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update documentos" ON public.documentos_gerados USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view documentos in their organization" ON public.documentos_gerados USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_docs_insert ON public.documentos_gerados WITH CHECK ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY briefing_docs_select ON public.documentos_gerados USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY briefing_docs_update ON public.documentos_gerados USING ((is_platform_admin() OR is_cca_user() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY "Users can create own DSAR requests" ON public.dsar_requests WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can view own DSAR requests" ON public.dsar_requests USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert lifecycle events for org contracts" ON public.eventos_ciclo_vida_contrato WITH CHECK ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = eventos_ciclo_vida_contrato.contrato_id) AND (om.user_id = (select auth.uid()))))));
ALTER POLICY "Users can view lifecycle events in their organization" ON public.eventos_ciclo_vida_contrato USING ((EXISTS ( SELECT 1
   FROM (contratos c
     JOIN organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = eventos_ciclo_vida_contrato.contrato_id) AND (om.user_id = (select auth.uid()))))));
ALTER POLICY "Admins can delete eventos" ON public.eventos_legislativos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can insert eventos" ON public.eventos_legislativos WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update eventos" ON public.eventos_legislativos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view eventos in their organization" ON public.eventos_legislativos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_eventos_select ON public.eventos_legislativos USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY eventos_legislativos_delete ON public.eventos_legislativos USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))) OR fn_is_cca_internal_authorized((select auth.uid()))));
ALTER POLICY eventos_legislativos_insert ON public.eventos_legislativos WITH CHECK (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))) OR fn_is_cca_internal_authorized((select auth.uid()))));
ALTER POLICY eventos_legislativos_select ON public.eventos_legislativos USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))) OR fn_is_cca_internal_authorized((select auth.uid()))));
ALTER POLICY eventos_legislativos_update ON public.eventos_legislativos USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))) OR fn_is_cca_internal_authorized((select auth.uid()))));
ALTER POLICY "Org members or CCA users can read nav cache" ON public.financeiro_nav_cache USING ((fn_is_cca_internal_authorized((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM (organization_members om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.user_id = (select auth.uid())) AND (o.client_code = financeiro_nav_cache.jvris_id))))));
ALTER POLICY "Org members or CCA users can read nav items" ON public.financeiro_nav_items USING ((fn_is_cca_internal_authorized((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM (organization_members om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.user_id = (select auth.uid())) AND (o.client_code = financeiro_nav_items.jvris_id))))));
ALTER POLICY "Admins can delete folder items" ON public.folder_items USING ((is_platform_admin((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM ((client_folders cf
     JOIN organization_members om ON ((om.organization_id = cf.organization_id)))
     LEFT JOIN organization_settings os ON ((os.organization_id = cf.organization_id)))
  WHERE ((cf.id = folder_items.folder_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) AND (COALESCE(os.folder_allow_item_removal, false) = true))))));
ALTER POLICY "Editors can add items to folders" ON public.folder_items WITH CHECK ((EXISTS ( SELECT 1
   FROM (client_folders cf
     JOIN organization_members om ON ((om.organization_id = cf.organization_id)))
  WHERE ((cf.id = folder_items.folder_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "Editors can update folder items" ON public.folder_items USING ((EXISTS ( SELECT 1
   FROM (client_folders cf
     JOIN organization_members om ON ((om.organization_id = cf.organization_id)))
  WHERE ((cf.id = folder_items.folder_id) AND (om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))));
ALTER POLICY "View folder items for org members" ON public.folder_items USING ((EXISTS ( SELECT 1
   FROM client_folders cf
  WHERE ((cf.id = folder_items.folder_id) AND user_belongs_to_organization((select auth.uid()), cf.organization_id)))));
ALTER POLICY "Admins can delete impactos" ON public.impactos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can insert impactos" ON public.impactos WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update impactos" ON public.impactos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view impactos in their organization" ON public.impactos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_impactos_insert ON public.impactos WITH CHECK ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY briefing_impactos_select ON public.impactos USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY "Platform admins can manage impersonation sessions" ON public.impersonation_sessions USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can delete invoices" ON public.invoices USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can insert invoices" ON public.invoices WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can update invoices" ON public.invoices USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "View invoices for org members or platform admin" ON public.invoices USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY notification_preferences_own ON public.notification_preferences USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Users can delete own notifications" ON public.notifications USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can receive notifications" ON public.notifications WITH CHECK (((user_id = (select auth.uid())) OR ((select auth.uid()) IS NOT NULL)));
ALTER POLICY "Users can update own notifications" ON public.notifications USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view own notifications" ON public.notifications USING (((select auth.uid()) = user_id));
ALTER POLICY briefing_notifications_insert ON public.notifications WITH CHECK ((is_platform_admin() OR is_cca_user() OR (user_id = (select auth.uid()))));
ALTER POLICY briefing_notifications_select ON public.notifications USING (((user_id = (select auth.uid())) OR is_platform_admin()));
ALTER POLICY briefing_notifications_update ON public.notifications USING ((user_id = (select auth.uid())));
ALTER POLICY odr_delete ON public.on_demand_requests USING ((((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY odr_insert ON public.on_demand_requests WITH CHECK (((organization_id = get_user_organization_id((select auth.uid()))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY odr_select ON public.on_demand_requests USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY odr_update ON public.on_demand_requests USING (((organization_id = get_user_organization_id((select auth.uid()))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid())))) WITH CHECK (((organization_id = get_user_organization_id((select auth.uid()))) OR is_cca_user((select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY organization_document_checklist_read ON public.organization_document_checklist USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))) OR (EXISTS ( SELECT 1
   FROM cca_internal_users
  WHERE (cca_internal_users.email = (select auth.email()))))));
ALTER POLICY organization_document_checklist_write ON public.organization_document_checklist USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = (select auth.uid())) AND (organization_members.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))) OR (EXISTS ( SELECT 1
   FROM cca_internal_users
  WHERE (cca_internal_users.email = (select auth.email())))))) WITH CHECK (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = (select auth.uid())) AND (organization_members.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role]))))) OR (EXISTS ( SELECT 1
   FROM cca_internal_users
  WHERE (cca_internal_users.email = (select auth.email()))))));
ALTER POLICY "Platform admins and org admins can manage members" ON public.organization_members USING (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid())))) WITH CHECK (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Users can view members of their organizations or platform admin" ON public.organization_members USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY briefing_om_select ON public.organization_members USING ((is_platform_admin() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text)) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_manager'::text) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = organization_members.user_id) AND (ud.organization_id = organization_members.organization_id) AND (ud.department_id = my_department_in_org(ud.organization_id)))))) OR (is_cca_user() AND (organization_id = get_cca_org_id())) OR (user_id = (select auth.uid()))));
ALTER POLICY briefing_om_update ON public.organization_members USING ((is_platform_admin() OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY "Admins and owners can insert organization settings" ON public.organization_settings WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = (select auth.uid())) AND (organization_members.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role]))))));
ALTER POLICY "Admins and owners can update organization settings" ON public.organization_settings USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = (select auth.uid())) AND (organization_members.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role]))))));
ALTER POLICY "Users can view their organization settings" ON public.organization_settings USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = (select auth.uid())))));
ALTER POLICY "Owners can manage their organization subscription" ON public.organization_subscriptions USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = 'owner'::app_role)));
ALTER POLICY "Users can view their organization subscription" ON public.organization_subscriptions USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "CCA internal can view all organizations" ON public.organizations USING (fn_is_cca_internal_authorized((select auth.uid())));
ALTER POLICY "CCA users read all organizations" ON public.organizations USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.auth_method = 'sso_cca'::text)))));
ALTER POLICY organizations_admin_full_access ON public.organizations USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY organizations_read_access ON public.organizations USING ((is_platform_admin((select auth.uid())) OR is_cca_user((select auth.uid())) OR user_belongs_to_organization((select auth.uid()), id)));
ALTER POLICY "Admins full access" ON public.organizations_legacy USING ((EXISTS ( SELECT 1
   FROM platform_users pu
  WHERE ((pu.email = ((select auth.jwt()) ->> 'email'::text)) AND (pu.role = 'app_admin'::text)))));
ALTER POLICY "CCA internal users can read organizations_legacy" ON public.organizations_legacy USING (fn_is_cca_internal_authorized((select auth.uid())));
ALTER POLICY "CCA users read all" ON public.organizations_legacy USING ((EXISTS ( SELECT 1
   FROM platform_users pu
  WHERE ((pu.email = ((select auth.jwt()) ->> 'email'::text)) AND (pu.role = ANY (ARRAY['app_admin'::text, 'cca_manager'::text, 'cca_user'::text]))))));
ALTER POLICY "Platform admins can delete platform admins" ON public.platform_admins USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can insert platform admins" ON public.platform_admins WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can update platform admins" ON public.platform_admins USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Platform admins can view all platform admins" ON public.platform_admins USING (is_platform_admin((select auth.uid())));
ALTER POLICY "Service role can manage platform_admins" ON public.platform_admins USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Admins can delete politicas" ON public.politicas USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Editors can insert politicas" ON public.politicas WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update politicas" ON public.politicas USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view politicas in their organization" ON public.politicas USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_politicas_select ON public.politicas USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY "Members can view profiles of same organization" ON public.profiles USING (((id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM (organization_members om1
     JOIN organization_members om2 ON ((om1.organization_id = om2.organization_id)))
  WHERE ((om1.user_id = (select auth.uid())) AND (om2.user_id = profiles.id)))) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Platform admins can view all profiles" ON public.profiles USING (((id = (select auth.uid())) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Users can insert own profile" ON public.profiles WITH CHECK (((select auth.uid()) = id));
ALTER POLICY "Users can update own profile" ON public.profiles USING (((select auth.uid()) = id));
ALTER POLICY "Users can view own profile" ON public.profiles USING ((id = (select auth.uid())));
ALTER POLICY "Admins can delete requisitos" ON public.requisitos USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Editors can insert requisitos" ON public.requisitos WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update requisitos" ON public.requisitos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view requisitos in their organization" ON public.requisitos USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_requisitos_select ON public.requisitos USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY "Admins can delete SharePoint config" ON public.sharepoint_config USING (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins can insert SharePoint config" ON public.sharepoint_config WITH CHECK (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins can update SharePoint config" ON public.sharepoint_config USING (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "CCA internal can view all SharePoint configs" ON public.sharepoint_config USING (fn_is_cca_internal_authorized((select auth.uid())));
ALTER POLICY "Members can view SharePoint config" ON public.sharepoint_config USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "CCA internal can view all SharePoint documents" ON public.sharepoint_documents USING (fn_is_cca_internal_authorized((select auth.uid())));
ALTER POLICY "Members can view SharePoint documents" ON public.sharepoint_documents USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Service can manage SharePoint documents" ON public.sharepoint_documents USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "CCA internal can view all SharePoint sync logs" ON public.sharepoint_sync_logs USING (fn_is_cca_internal_authorized((select auth.uid())));
ALTER POLICY "Members can view sync logs" ON public.sharepoint_sync_logs USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Service can manage sync logs" ON public.sharepoint_sync_logs USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY platform_admins_delete_sso_admin_emails ON public.sso_admin_emails USING ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))));
ALTER POLICY platform_admins_insert_sso_admin_emails ON public.sso_admin_emails WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))));
ALTER POLICY platform_admins_select_sso_admin_emails ON public.sso_admin_emails USING ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))));
ALTER POLICY platform_admins_update_sso_admin_emails ON public.sso_admin_emails USING ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))));
ALTER POLICY "Admins can delete templates" ON public.templates USING (((organization_id = get_user_organization_id((select auth.uid()))) AND (get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))));
ALTER POLICY "Editors can insert templates" ON public.templates WITH CHECK ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Editors can update templates" ON public.templates USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY "Users can view templates in their organization" ON public.templates USING ((organization_id = get_user_organization_id((select auth.uid()))));
ALTER POLICY briefing_templates_insert ON public.templates WITH CHECK ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY briefing_templates_select ON public.templates USING ((is_platform_admin() OR is_cca_user() OR (organization_id = get_user_organization_id((select auth.uid())))));
ALTER POLICY briefing_templates_update ON public.templates USING ((is_platform_admin() OR (my_user_type_in_org(organization_id) = ANY (ARRAY['cca_manager'::text, 'cca_admin'::text, 'cca_user'::text])) OR ((organization_id = get_user_organization_id((select auth.uid()))) AND (my_user_type_in_org(organization_id) = 'org_user'::text))));
ALTER POLICY "Users can insert own consents" ON public.user_consents WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own consents" ON public.user_consents USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view own consents" ON public.user_consents USING (((select auth.uid()) = user_id));
ALTER POLICY "Admins and owners can delete user_departments" ON public.user_departments USING (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Admins and owners can insert user_departments" ON public.user_departments WITH CHECK (((get_user_org_role((select auth.uid()), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Members can view user_departments of their org or platform admi" ON public.user_departments USING ((user_belongs_to_organization((select auth.uid()), organization_id) OR is_platform_admin((select auth.uid()))));
ALTER POLICY "Users can insert their own user_departments" ON public.user_departments WITH CHECK (((user_id = (select auth.uid())) AND user_belongs_to_organization((select auth.uid()), organization_id)));
ALTER POLICY user_invites_admin_all ON public.user_invites USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));
ALTER POLICY "Owners and admins can manage roles in their organization" ON public.user_roles USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])) AND (EXISTS ( SELECT 1
           FROM organization_members target_om
          WHERE ((target_om.user_id = user_roles.user_id) AND (target_om.organization_id = om.organization_id)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = (select auth.uid())) AND (om.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))))));
ALTER POLICY "Users can view their own roles" ON public.user_roles USING ((user_id = (select auth.uid())));
ALTER POLICY users_import_admin_all ON public.users_import USING (is_platform_admin((select auth.uid()))) WITH CHECK (is_platform_admin((select auth.uid())));

-- Restantes 4 políticas (schema legal + platform_users com current_setting)
ALTER POLICY "service role manage documents" ON legal.documents USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "service role manage fetch_queue" ON legal.fetch_queue USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "service role manage sources" ON legal.sources USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY platform_users_select_own ON public.platform_users USING ((email = ((NULLIF((select current_setting('request.jwt.claims'::text, true)), ''::text))::jsonb ->> 'email'::text)));
