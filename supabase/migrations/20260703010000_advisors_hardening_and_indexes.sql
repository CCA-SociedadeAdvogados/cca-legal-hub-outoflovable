-- Correções a partir dos advisors de segurança/performance do Supabase.
--
-- 1) Segurança: fixar search_path da função com search_path mutável
--    (function_search_path_mutable) — evita hijack via search_path.
-- 2) Performance: remover índice duplicado em platform_users.
-- 3) Performance: criar índice de cobertura para todas as foreign keys que
--    não tinham um (unindexed_foreign_keys) — evita full scans em joins/cascades
--    e melhora o desempenho à medida que os dados crescem.
--
-- Nota: as políticas RLS com auth_rls_initplan e as multiple_permissive_policies
-- NÃO são tratadas aqui — o refactor de ~196 políticas de controlo de acesso
-- exige revisão e teste caso a caso e será feito em migração dedicada.
-- Os buckets públicos (org-assets, legal-mirror) servem URLs públicas usadas
-- pela aplicação; passá-los a privados implica migrar o frontend para signed
-- URLs e é acompanhado à parte.

-- 1) search_path imutável na função de trigger
ALTER FUNCTION public.update_bc_updated_at() SET search_path = public, pg_temp;

-- 2) índice duplicado (manter idx_platform_users_email)
DROP INDEX IF EXISTS public.platform_users_email_idx;

-- 3) índices de cobertura para foreign keys
CREATE INDEX IF NOT EXISTS idx_anexos_contrato_contrato_id ON anexos_contrato (contrato_id);
CREATE INDEX IF NOT EXISTS idx_anexos_contrato_uploaded_by_id ON anexos_contrato (uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_assunto_eventos_organization_id ON assunto_eventos (organization_id);
CREATE INDEX IF NOT EXISTS idx_assuntos_responsavel_id ON assuntos (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_bc_config_created_by ON bc_config (created_by);
CREATE INDEX IF NOT EXISTS idx_bc_sync_logs_organization_id ON bc_sync_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_cca_news_created_by_id ON cca_news (created_by_id);
CREATE INDEX IF NOT EXISTS idx_client_folders_created_by_id ON client_folders (created_by_id);
CREATE INDEX IF NOT EXISTS idx_client_folders_updated_by_id ON client_folders (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_contract_ai_extractions_created_by ON contract_ai_extractions (created_by);
CREATE INDEX IF NOT EXISTS idx_contract_ai_jobs_canonical_extraction_id ON contract_ai_jobs (canonical_extraction_id);
CREATE INDEX IF NOT EXISTS idx_contract_ai_jobs_draft_extraction_id ON contract_ai_jobs (draft_extraction_id);
CREATE INDEX IF NOT EXISTS idx_contract_audit_log_created_by ON contract_audit_log (created_by);
CREATE INDEX IF NOT EXISTS idx_contract_compliance_analyses_created_by_id ON contract_compliance_analyses (created_by_id);
CREATE INDEX IF NOT EXISTS idx_contract_extractions_created_by_id ON contract_extractions (created_by_id);
CREATE INDEX IF NOT EXISTS idx_contrato_normativos_created_by_id ON contrato_normativos (created_by_id);
CREATE INDEX IF NOT EXISTS idx_contratos_created_by_id ON contratos (created_by_id);
CREATE INDEX IF NOT EXISTS idx_contratos_iniciado_por_id ON contratos (iniciado_por_id);
CREATE INDEX IF NOT EXISTS idx_contratos_responsavel_interno_id ON contratos (responsavel_interno_id);
CREATE INDEX IF NOT EXISTS idx_contratos_responsavel_revisao_renovacao_id ON contratos (responsavel_revisao_renovacao_id);
CREATE INDEX IF NOT EXISTS idx_contratos_updated_by_id ON contratos (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_departments_created_by_id ON departments (created_by_id);
CREATE INDEX IF NOT EXISTS idx_documentos_gerados_contrato_id ON documentos_gerados (contrato_id);
CREATE INDEX IF NOT EXISTS idx_documentos_gerados_created_by_id ON documentos_gerados (created_by_id);
CREATE INDEX IF NOT EXISTS idx_documentos_gerados_template_id ON documentos_gerados (template_id);
CREATE INDEX IF NOT EXISTS idx_eventos_ciclo_vida_contrato_contrato_id ON eventos_ciclo_vida_contrato (contrato_id);
CREATE INDEX IF NOT EXISTS idx_eventos_ciclo_vida_contrato_criado_por_id ON eventos_ciclo_vida_contrato (criado_por_id);
CREATE INDEX IF NOT EXISTS idx_eventos_legislativos_created_by_id ON eventos_legislativos (created_by_id);
CREATE INDEX IF NOT EXISTS idx_eventos_legislativos_updated_by_id ON eventos_legislativos (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_created_by_id ON folder_items (created_by_id);
CREATE INDEX IF NOT EXISTS idx_impactos_contrato_id ON impactos (contrato_id);
CREATE INDEX IF NOT EXISTS idx_impactos_created_by_id ON impactos (created_by_id);
CREATE INDEX IF NOT EXISTS idx_impactos_evento_legislativo_id ON impactos (evento_legislativo_id);
CREATE INDEX IF NOT EXISTS idx_impactos_resolvido_por_id ON impactos (resolvido_por_id);
CREATE INDEX IF NOT EXISTS idx_on_demand_requests_responsavel_id ON on_demand_requests (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_on_demand_requests_solicitado_por_id ON on_demand_requests (solicitado_por_id);
CREATE INDEX IF NOT EXISTS idx_organization_document_checklist_checklist_type_id ON organization_document_checklist (checklist_type_id);
CREATE INDEX IF NOT EXISTS idx_organization_document_checklist_updated_by_id ON organization_document_checklist (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id ON organization_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_politicas_created_by_id ON politicas (created_by_id);
CREATE INDEX IF NOT EXISTS idx_politicas_updated_by_id ON politicas (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_organization_id ON profiles (current_organization_id);
CREATE INDEX IF NOT EXISTS idx_requisitos_created_by_id ON requisitos (created_by_id);
CREATE INDEX IF NOT EXISTS idx_requisitos_evento_legislativo_id ON requisitos (evento_legislativo_id);
CREATE INDEX IF NOT EXISTS idx_sso_admin_emails_added_by ON sso_admin_emails (added_by);
CREATE INDEX IF NOT EXISTS idx_templates_created_by_id ON templates (created_by_id);
CREATE INDEX IF NOT EXISTS idx_templates_updated_by_id ON templates (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_created_by_id ON user_departments (created_by_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments (department_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_created_by_id ON user_invites (created_by_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_organization_id ON user_invites (organization_id);
