# Teste de aceitação de segurança — Timelines de processos

Valida o princípio de segurança do brief (`docs/timelines/feature-timelines-brief.md`,
secção 4): o "nunca com prazos" do cliente é garantido na camada de dados, e o
único caminho de leitura do cliente são os RPCs `tl_client_*`.

## Como correr (Postgres local)

Requer PostgreSQL ≥ 15 (o teste corre num Postgres vazio; **não** correr contra
a base de produção — o `testdata.sql` insere linhas com UUIDs fixos):

```bash
createdb tl_test
psql -d tl_test -v ON_ERROR_STOP=1 -f supabase/tests/timelines/shim.sql
psql -d tl_test -v ON_ERROR_STOP=1 -f supabase/migrations/20260720120000_timelines_processos.sql
psql -d tl_test -v ON_ERROR_STOP=1 -f supabase/tests/timelines/testdata.sql
psql -d tl_test -f supabase/tests/timelines/test_acceptance.sql
```

O `shim.sql` replica o ambiente Supabase: roles `anon`/`authenticated`/`service_role`,
`auth.uid()` baseado em `request.jwt.claims`, o esquema mínimo de identidade real
do repo (`profiles`, `organizations`, `organization_members`, `platform_admins`)
e os helpers `is_cca_user`/`is_platform_admin` copiados das migrações reais.
A simulação de utilizador autenticado usa `set role authenticated` +
`set request.jwt.claims` — o mesmo mecanismo do PostgREST.

## Resultados (2026-07-20, PostgreSQL 16.13)

| # | Verificação | Esperado | Resultado |
|---|-------------|----------|-----------|
| 0 | Assinatura de `tl_client_timeline` | Só `ordem, label, tipo, estado` — sem colunas de data | ✅ `TABLE(ordem integer, label text, tipo text, estado text)` |
| 0b | Assinatura de `tl_client_instances` | Sem colunas de data | ✅ `TABLE(instance_id uuid, matter_ref text, template_key text, template_title text)` |
| A1 | `org_user`: SELECT direto `tl_instance_phases` | 0 linhas | ✅ 0 |
| A2 | `org_user`: SELECT direto `tl_templates`/`tl_phases`/`tl_instances` | 0 linhas | ✅ 0/0/0 |
| A3 | `org_user`: `tl_lawyer_timeline(...)` | 0 linhas | ✅ 0 |
| A4 | `org_user`: `tl_set_phase(...)` | erro | ✅ `ERROR: not authorized` |
| A5 | `org_user`: INSERT direto | erro RLS | ✅ `new row violates row-level security policy` |
| A6 | `org_user`: UPDATE direto | 0 linhas afetadas | ✅ `UPDATE 0` |
| A7 | `org_user`: `tl_client_timeline` do seu caso | 2 linhas (só `ativa`+`concluida`), sem datas | ✅ |
| A8 | `org_user`: `tl_client_instances` | 1 linha, sem datas | ✅ |
| B1 | `org_user` de outra org: `tl_client_timeline` de caso alheio | 0 linhas | ✅ 0 |
| B2 | `org_user` de outra org: `tl_client_instances` | 0 linhas | ✅ 0 |
| C1 | advogado CCA: `tl_lawyer_timeline` | 3 linhas com `prazo_calculado`/`base_legal`/`notas` | ✅ |
| C2 | advogado: `tl_set_phase` pendente→ativa | sucesso | ✅ |
| C3 | advogado: `tl_set_phase` →concluida preenche `data_conclusao` | `current_date` | ✅ |
| C4 | advogado: `tl_set_phase` estado inválido | erro | ✅ `ERROR: estado invalido` |
| C5 | advogado: SELECT direto | acesso total | ✅ 3 linhas |

**Conclusão:** o papel `org_user` não consegue obter nenhuma coluna de
prazo/data por nenhum caminho (tabelas diretas, RPC de advogado ou mutação);
`tl_client_timeline`/`tl_client_instances` não devolvem essas colunas por
construção (garantido pela assinatura das funções, verificação 0/0b).

## Validação na base remota (2026-07-20, projeto `scjxhhkutsiswsgsuiqo`)

Depois de aplicada a migração em produção, as verificações-chave foram
repetidas via Management API com **utilizadores reais** (JWT simulado com
`set local role authenticated` + `request.jwt.claims`):

| Verificação | Resultado |
|---|---|
| 4 tabelas `tl_*` criadas com `relrowsecurity = true` e política `*_lawyer` | ✅ |
| Assinaturas de `tl_client_timeline`/`tl_client_instances` sem colunas de data | ✅ |
| Utilizador org real (`auth_method='local'`): SELECT direto às tabelas + `tl_lawyer_timeline` | ✅ 0 linhas |
| Utilizador org real: `tl_set_phase` | ✅ `ERROR: not authorized` |
| Utilizador org real: INSERT direto | ✅ erro RLS |
| Utilizador org real: `tl_is_lawyer()` / `tl_role()` | ✅ `false` / `org_manager` |
| Utilizador CCA real (`sso_cca`): `tl_is_lawyer()` / `tl_role()` / SELECT direto | ✅ `true` / `cca_user` / acesso |

A migração ficou registada em `supabase_migrations.schema_migrations`
(versão `20260720120000`).
