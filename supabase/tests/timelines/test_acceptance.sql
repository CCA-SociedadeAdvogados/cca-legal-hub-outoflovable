\set ON_ERROR_STOP off
\pset footer off

\echo '=================================================================='
\echo 'TESTE 0 — assinatura de tl_client_timeline (não pode ter colunas de data)'
\echo '=================================================================='
select proname, pg_get_function_result(oid) as returns
from pg_proc where proname in ('tl_client_timeline','tl_client_instances') order by proname;

\echo ''
\echo '=================================================================='
\echo 'CENÁRIO A — autenticado como org_user (Cliente A, role viewer)'
\echo '=================================================================='
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

\echo '--- A1. select direto a tl_instance_phases (esperado: 0 linhas) ---'
select count(*) as linhas_tl_instance_phases from public.tl_instance_phases;

\echo '--- A2. select direto às restantes tabelas tl_* (esperado: 0 linhas) ---'
select
  (select count(*) from public.tl_templates)  as tpl,
  (select count(*) from public.tl_phases)     as phs,
  (select count(*) from public.tl_instances)  as inst;

\echo '--- A3. tl_lawyer_timeline (esperado: 0 linhas) ---'
select count(*) as linhas_lawyer_timeline
from public.tl_lawyer_timeline('00000000-0000-0000-0000-000000000020');

\echo '--- A4. tl_set_phase (esperado: ERRO not authorized) ---'
select public.tl_set_phase('00000000-0000-0000-0000-000000000022', 'concluida');

\echo '--- A5. INSERT direto em tl_instance_phases (esperado: ERRO RLS) ---'
insert into public.tl_instance_phases (instance_id, phase_id) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000013');

\echo '--- A6. UPDATE direto (esperado: 0 linhas afetadas) ---'
update public.tl_instance_phases set estado = 'concluida' returning id;

\echo '--- A7. tl_client_timeline do seu caso (esperado: 2 linhas — ativa+concluida, SÓ ordem/label/tipo/estado) ---'
select * from public.tl_client_timeline('00000000-0000-0000-0000-000000000020');

\echo '--- A8. tl_client_instances (esperado: 1 linha, sem datas) ---'
select * from public.tl_client_instances();

reset role;
reset request.jwt.claims;

\echo ''
\echo '=================================================================='
\echo 'CENÁRIO B — org_user de OUTRA org (Cliente B) a tentar ver o caso do Cliente A'
\echo '=================================================================='
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

\echo '--- B1. tl_client_timeline do caso do Cliente A (esperado: 0 linhas) ---'
select count(*) as linhas from public.tl_client_timeline('00000000-0000-0000-0000-000000000020');

\echo '--- B2. tl_client_instances (esperado: 0 linhas) ---'
select count(*) as linhas from public.tl_client_instances();

reset role;
reset request.jwt.claims;

\echo ''
\echo '=================================================================='
\echo 'CENÁRIO C — autenticado como advogado CCA (membro org cca_owner)'
\echo '=================================================================='
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

\echo '--- C1. tl_lawyer_timeline (esperado: 3 linhas com prazo_calculado/base_legal/notas) ---'
select ordem, label, tipo, estado, prazo_calculado, data_conclusao, confirmar, base_legal
from public.tl_lawyer_timeline('00000000-0000-0000-0000-000000000020');

\echo '--- C2. tl_set_phase pendente->ativa (esperado: sucesso) ---'
select public.tl_set_phase('00000000-0000-0000-0000-000000000023', 'ativa');
select estado, data_conclusao from public.tl_instance_phases where id = '00000000-0000-0000-0000-000000000023';

\echo '--- C3. tl_set_phase ativa->concluida preenche data_conclusao (esperado: current_date) ---'
select public.tl_set_phase('00000000-0000-0000-0000-000000000023', 'concluida');
select estado, data_conclusao = current_date as data_ok from public.tl_instance_phases where id = '00000000-0000-0000-0000-000000000023';

\echo '--- C4. tl_set_phase estado inválido (esperado: ERRO estado invalido) ---'
select public.tl_set_phase('00000000-0000-0000-0000-000000000023', 'xpto');

\echo '--- C5. select direto (esperado: acesso total, 3 linhas) ---'
select count(*) as linhas_tl_instance_phases from public.tl_instance_phases;

reset role;
reset request.jwt.claims;
