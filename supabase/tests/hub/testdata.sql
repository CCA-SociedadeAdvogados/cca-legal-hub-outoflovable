-- Dados ANTES da migração hub (valida backfill/cópias/sync)
insert into public.organizations (id, name, org_type, client_code, "group") values
  ('00000000-0000-0000-0000-00000000000a', 'CCA', 'cca_owner', 'C.0000', null),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa A1', 'client', 'C.1111', 'Grupo Teste'),
  ('00000000-0000-0000-0000-00000000000c', 'Empresa A2', 'client', 'C.1112', 'Grupo Teste'),
  ('00000000-0000-0000-0000-00000000000d', 'Cliente B', 'client', 'C.2222', null);

insert into public.profiles (id, email, auth_method, current_organization_id) values
  ('00000000-0000-0000-0000-000000000001', 'advogado@cca.law', 'sso_cca', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-000000000002', 'user@a1.pt', 'local', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-000000000003', 'user@b.pt', 'local', '00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-000000000004', 'restrito@a1.pt', 'local', '00000000-0000-0000-0000-00000000000b');

insert into public.organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', 'editor'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000002', 'viewer'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000002', 'viewer'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000003', 'viewer'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000004', 'viewer');

-- Assuntos pré-existentes (o backfill da migração deve publicá-los)
insert into public.assuntos (id, organization_id, titulo) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-00000000000b', 'Assunto pré-existente'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-00000000000b', 'Assunto laboral (restrito)');

-- Eventos manuais pré-existentes (a migração copia p/ hub_eventos)
insert into public.assunto_eventos (id, assunto_id, organization_id, titulo, tipo, data, visivel_cliente) values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-00000000000b', 'Reunião de kick-off', 'marco', current_date - 30, true),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-00000000000b', 'Nota interna', 'atualizacao', current_date - 10, false),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-00000000000b', 'Relatório DD disponível', 'documento', current_date - 5, true);

-- Contrato ativo com datas futuras (o sync deve gerar 2 eventos data_contratual)
insert into public.contratos (id, organization_id, titulo_contrato, estado_contrato, data_termo, data_limite_decisao_renovacao) values
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-00000000000b', 'Contrato de Serviços X', 'activo', current_date + 60, current_date + 30);

-- Timeline de processo (para testar tl_set_phase → marco_fase)
insert into public.tl_templates (id, key, title) values
  ('00000000-0000-0000-0000-000000000010', 'teste', 'Template Teste');
insert into public.tl_phases (id, template_id, ordem, label, tipo) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 1, 'Fase Um', 'marco');
insert into public.tl_instances (id, template_id, matter_ref, org_id) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Proc. 1/26', '00000000-0000-0000-0000-00000000000b');
insert into public.tl_instance_phases (id, instance_id, phase_id) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011');
