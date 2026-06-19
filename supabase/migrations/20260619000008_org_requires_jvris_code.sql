-- Salvaguarda JVRIS: qualquer organização (exceto a CCA owner) tem de ter um
-- client_code no formato JVRIS (C.XXXX). Impede criar clientes/organizações
-- fora da lógica do JVRIS — alinhando a plataforma com a base de dados de origem.
-- Os clientes reais são provisionados a partir do JVRIS (fn_provision_org_for_client_code
-- / NAV sync) e já cumprem; bloqueia apenas os caminhos de criação genéricos sem código.
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_jvris_code_required
  CHECK (org_type = 'cca_owner' OR (client_code IS NOT NULL AND client_code ~ '^C\.[0-9]+$'));
