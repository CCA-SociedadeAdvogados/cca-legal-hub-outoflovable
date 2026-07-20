\set ON_ERROR_STOP off
\pset footer off

\echo '===== H0. Migração de dados ====='
\echo '--- backfill: assuntos pré-existentes publicados (esperado: 2 true) ---'
select count(*) filter (where publicado) as publicados from public.assuntos;
\echo '--- cópia assunto_eventos → hub_eventos (esperado: 3; nota interna NÃO publicada; passados concluídos) ---'
select titulo_cliente, tipo, publicado, concluido from public.hub_eventos where origem = 'manual' order by data_evento;
\echo '--- sync contratos (esperado: 2 eventos data_contratual publicados) ---'
select titulo_cliente, tipo, publicado from public.hub_eventos where origem = 'clm' order by data_evento;
\echo '--- grupos semeados de organizations."group" (esperado: Grupo Teste com 2 empresas) ---'
select g.nome, count(o.id) as empresas from public.hub_grupos g left join public.organizations o on o.hub_grupo_id = g.id group by g.nome;

\echo ''
\echo '===== H1. Guardas de dados ====='
\echo '--- evento interno + publicado (esperado: ERRO) ---'
insert into public.hub_eventos (organization_id, tipo, titulo_cliente, data_evento, interno, publicado)
values ('00000000-0000-0000-0000-00000000000b', 'prazo_processual', 'x', current_date, true, true);

\echo '--- publicar carimba aprovador (esperado: aprovado_em não nulo) ---'
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.hub_eventos (id, organization_id, assunto_id, tipo, titulo_cliente, titulo_interno, data_evento, publicado)
values ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000030', 'audiencia', 'Audiência de julgamento', 'julgamento 1ª sessão', current_date + 14, true);
select aprovado_por is not null as tem_aprovador, aprovado_em is not null as tem_data from public.hub_eventos where id = '00000000-0000-0000-0000-000000000060';
commit;

-- rascunho não publicado + vencido publicado (para os testes seguintes)
insert into public.hub_eventos (id, organization_id, assunto_id, tipo, titulo_cliente, titulo_interno, data_evento, publicado)
values ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000030', 'marco_fase', 'Rascunho por curar', 'draft', current_date + 3, false);
insert into public.hub_eventos (id, organization_id, assunto_id, tipo, titulo_cliente, data_evento, publicado, requer_acao_cliente)
values ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000030', 'prazo_processual', 'Falta documentação do cliente', current_date - 2, true, true);
-- assunto NÃO publicado com evento publicado (não deve sair)
update public.assuntos set publicado = false where id = '00000000-0000-0000-0000-000000000031';
insert into public.hub_eventos (organization_id, assunto_id, tipo, titulo_cliente, data_evento, publicado)
values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000031', 'audiencia', 'Evento de assunto não publicado', current_date + 5, true);

\echo ''
\echo '===== H2. Cliente (org_user A1) ====='
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
\echo '--- select direto a hub_eventos (esperado: 0) ---'
select count(*) as direto from public.hub_eventos;
\echo '--- assuntos visíveis (esperado: 1 — só o publicado) ---'
select count(*) as assuntos from public.assuntos;
\echo '--- hub_client_timeline do assunto publicado (esperado: kick-off+relatório+audiência+vencido = 4; SEM rascunho, SEM nota interna) ---'
select titulo, tipo, estado, requer_acao_cliente from public.hub_client_timeline('00000000-0000-0000-0000-000000000030');
\echo '--- hub_client_prazos (esperado: 2 clm + audiência + vencido = 4; vencido com estado=vencido) ---'
select titulo, estado from public.hub_client_prazos() order by estado, titulo;
\echo '--- INSERT direto (esperado: ERRO RLS) ---'
insert into public.hub_eventos (organization_id, tipo, titulo_cliente, data_evento) values ('00000000-0000-0000-0000-00000000000b', 'marco_manual', 'hack', current_date);
\echo '--- hub_portal_config: membro lê a própria org (esperado: 0 linhas mas sem erro — ainda não há config) ---'
select count(*) as cfg from public.hub_portal_config;
\echo '--- hub_grupos: membro vê o seu grupo (esperado: 1) ---'
select count(*) as grupos from public.hub_grupos;
reset role; reset request.jwt.claims;

\echo ''
\echo '===== H3. Acesso restrito (user4 só vê assunto 31 designado) ====='
update public.organization_members set acesso_restrito = true where user_id = '00000000-0000-0000-0000-000000000004';
insert into public.hub_user_assuntos (user_id, assunto_id) values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000031');
update public.assuntos set publicado = true where id = '00000000-0000-0000-0000-000000000031';
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
\echo '--- assuntos (esperado: 1 — só o designado, apesar de haver 2 publicados) ---'
select titulo from public.assuntos;
\echo '--- timeline do assunto NÃO designado (esperado: 0) ---'
select count(*) as nao_designado from public.hub_client_timeline('00000000-0000-0000-0000-000000000030');
reset role; reset request.jwt.claims;

\echo ''
\echo '===== H4. Org alheia (user B) ====='
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
select (select count(*) from public.hub_client_prazos()) as prazos,
       (select count(*) from public.hub_client_timeline('00000000-0000-0000-0000-000000000030')) as timeline_alheia;
reset role; reset request.jwt.claims;

\echo ''
\echo '===== H5. tl_set_phase → marco_fase ====='
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.tl_set_phase('00000000-0000-0000-0000-000000000021', 'concluida');
commit;
\echo '--- (esperado: 1 rascunho marco_fase origem timelines, não publicado) ---'
select titulo_cliente, tipo, publicado, concluido from public.hub_eventos where origem = 'timelines';
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.tl_set_phase('00000000-0000-0000-0000-000000000021', 'ativa');
commit;
\echo '--- reverter apaga rascunho (esperado: 0) ---'
select count(*) as apos_reverter from public.hub_eventos where origem = 'timelines';

\echo ''
\echo '===== H6. Notificações ====='
insert into public.hub_eventos (organization_id, tipo, titulo_cliente, data_evento, publicado)
values ('00000000-0000-0000-0000-00000000000b', 'audiencia', 'Audiência em 3 dias', current_date + 3, true);
select public.fn_create_hub_prazo_notifications() as notifs_731;
\echo '--- 7/3/1 (esperado: >0; users locais da org A1) + publicação notifica ---'
select type, count(*) from public.notifications group by type order by type;

\echo ''
\echo '===== H7. Auditoria ====='
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select count(*) > 0 as tem_auditoria from public.hub_auditoria_list('00000000-0000-0000-0000-00000000000b', 10);
commit;
\echo '--- cliente não lê auditoria (esperado: 0) ---'
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select count(*) as auditoria_cliente from public.hub_auditoria_list('00000000-0000-0000-0000-00000000000b', 10);
reset role; reset request.jwt.claims;
