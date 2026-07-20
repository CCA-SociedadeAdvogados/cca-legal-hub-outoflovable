# Teste de aceitação — Hub CCA Fase 1

Valida a migração `20260720200000_hub_fase1.sql` (base única de eventos,
publicação opt-in de assuntos, grupos de acesso, acesso restrito,
configuração do portal e auditoria — ver `docs/hub/blueprint-implementacao.md`).

## Como correr (Postgres local ≥ 15; **não** correr contra produção)

```bash
createdb hub_test
psql -d hub_test -v ON_ERROR_STOP=1 -f supabase/tests/hub/shim.sql
psql -d hub_test -v ON_ERROR_STOP=1 -f supabase/migrations/20260720120000_timelines_processos.sql
psql -d hub_test -v ON_ERROR_STOP=1 -f supabase/migrations/20260720180000_tl_activate_all_phases.sql
psql -d hub_test -v ON_ERROR_STOP=1 -f supabase/tests/hub/testdata.sql
# migração hub sem o create extension (o shim inclui um stub de cron.schedule)
sed 's/^create extension if not exists pg_cron;/-- stub local/' \
  supabase/migrations/20260720200000_hub_fase1.sql | psql -d hub_test -v ON_ERROR_STOP=1
psql -d hub_test -f supabase/tests/hub/test_acceptance.sql
```

Os dados de teste são inseridos **antes** da migração, para validar também o
backfill (`assuntos.publicado`), a cópia `assunto_eventos → hub_eventos` e o
sync inicial de contratos.

## Resultados (2026-07-20, PG16 local)

| Grupo | Verificação | Resultado |
|---|---|---|
| H0 | Backfill: assuntos pré-existentes ficam publicados | ✅ 2/2 |
| H0 | Cópia assunto_eventos→hub_eventos (visível→publicado; passados→concluídos; nota interna não publicada) | ✅ 3 eventos |
| H0 | Sync de contratos → 2 eventos `data_contratual` publicados | ✅ |
| H0 | Grupos semeados de `organizations."group"` | ✅ 1 grupo, 2 empresas |
| H1 | Evento `interno` não é publicável | ✅ erro na camada de dados |
| H1 | Publicar carimba `aprovado_por`/`aprovado_em` | ✅ |
| H2 | org_user: SELECT direto a hub_eventos | ✅ 0 linhas |
| H2 | org_user: só vê assuntos publicados | ✅ 1 de 2 |
| H2 | `hub_client_timeline`: sem rascunhos, sem notas internas, estado calculado | ✅ 4 eventos |
| H2 | `hub_client_prazos`: vencido com estado próprio, nunca misturado | ✅ 4 (1 vencido) |
| H2 | org_user: INSERT direto | ✅ erro RLS |
| H2 | membro lê hub_portal_config e o seu hub_grupos | ✅ |
| H3 | Acesso restrito: só assuntos designados | ✅ 1 de 2; timeline de não designado = 0 |
| H4 | Org alheia: prazos e timeline de outra org | ✅ 0/0 |
| H5 | `tl_set_phase` concluir → rascunho `marco_fase`; reverter apaga rascunho | ✅ |
| H6 | Notificações 7/3/1 (`prazo_evento_3` para users locais) + notificação na publicação | ✅ |
| H6 | Backfill da migração NÃO gera notificações | ✅ 0 spam |
| H7 | Auditoria: CCA lê via `hub_auditoria_list`; cliente recebe 0 | ✅ |

## Validação em produção (`scjxhhkutsiswsgsuiqo`)

Após aplicar a migração: 4 tabelas hub criadas, 2 cron jobs agendados
(`hub-sync-contratos` 06:00 UTC, `hub-prazos-notificacoes` 07:00 UTC),
2 eventos `data_contratual` sincronizados dos contratos ativos, 0 notificações
de backfill; org_user real: SELECT direto = 0 linhas, RPCs de cliente
funcionais. Migração registada em `schema_migrations` (`20260720200000`).
