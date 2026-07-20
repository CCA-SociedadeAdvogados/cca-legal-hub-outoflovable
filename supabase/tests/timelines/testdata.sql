-- Dados de teste (inseridos como superuser = service role)
insert into public.organizations (id, name, org_type, client_code) values
  ('00000000-0000-0000-0000-00000000000a', 'CCA', 'cca_owner', 'C.0000'),
  ('00000000-0000-0000-0000-00000000000b', 'Cliente A', 'client', 'C.1111'),
  ('00000000-0000-0000-0000-00000000000c', 'Cliente B', 'client', 'C.2222');

insert into public.profiles (id, email, current_organization_id) values
  ('00000000-0000-0000-0000-000000000001', 'advogado@cca.law', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-000000000002', 'user@cliente-a.pt', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-000000000003', 'user@cliente-b.pt', '00000000-0000-0000-0000-00000000000c');

insert into public.organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', 'editor'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000002', 'viewer'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000003', 'viewer');

-- Template + fases (com colunas internas preenchidas)
insert into public.tl_templates (id, key, title, area, jurisdicao, base_legal, versao) values
  ('00000000-0000-0000-0000-000000000010', 'civel-cpc', 'Ação declarativa cível (CPC)', 'civel', 'PT', 'CPC', '1.0');

insert into public.tl_phases (id, template_id, ordem, label, tipo, base_legal, prazo_dias, contagem, confirmar, notas) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 1, 'Citação do réu', 'gatilho', 'art. 219.º CPC', null, null, false, 'nota interna 1'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 2, 'Contestação', 'prazo_parte', 'art. 569.º CPC', 30, 'cpc_suspende', true, 'nota interna 2'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', 3, 'Audiência prévia', 'marco', 'art. 591.º CPC', null, null, false, null);

-- Instância do Cliente A com colunas internas sensíveis
insert into public.tl_instances (id, template_id, matter_ref, org_id, gatilho_data, dilacao_dias, urgente, created_by) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Proc. 123/26.4T8LSB', '00000000-0000-0000-0000-00000000000b', '2026-07-01', 5, false, '00000000-0000-0000-0000-000000000001');

insert into public.tl_instance_phases (id, instance_id, phase_id, estado, data_conclusao, prazo_calculado, notas_internas) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011', 'concluida', '2026-07-01', null, 'citação confirmada'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000012', 'ativa', null, '2026-09-15', 'prazo em curso'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000013', 'pendente', null, null, null);
