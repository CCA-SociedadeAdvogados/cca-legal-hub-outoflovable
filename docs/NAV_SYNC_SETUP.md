# Sincronização diária da conta corrente (NAV → Portal)

Mantém atualizada a conta corrente que o portal mostra em `/portal/financeiro`,
a partir de um Excel do NAV publicado no SharePoint.

## Fluxo

```
NAV (export diário)  →  Excel no SharePoint  →  sync-nav-excel (Graph lê o mais recente)
                                                      │  parse + substituição total
                                                      ▼
                                   financeiro_nav_cache + financeiro_nav_items
                                                      ▼
                                   RPCs fn_get_*_for_actor  →  Portal (Financeiro)
```

- A função escolhe o **ficheiro Excel mais recente** na pasta SharePoint configurada.
- A ligação ao cliente é feita por **`client_code`** (coluna `jvris_id` em
  `financeiro_nav_items` guarda o client_code).
- Substituição total: *upsert* do cache + apaga/insere os itens.

## Dois modos de disparo

| Modo | Quem | Como |
| --- | --- | --- |
| **Agendado** (novo) | GitHub Action diária | `POST /functions/v1/sync-nav-excel` com header `x-cron-secret` |
| **Manual** | Platform admin | Botão na app (JWT de admin) — inalterado |

No modo agendado, a `organization_id` é resolvida automaticamente (org `cca_owner`).

## Configuração (uma vez)

1. **Secret da edge function** (Supabase → Edge Functions → Secrets):
   - `NAV_SYNC_SECRET` = um valor aleatório forte.
   - (Já existentes e reutilizados: `SHAREPOINT_TENANT_ID/CLIENT_ID/CLIENT_SECRET`.)

2. **Secrets do repositório GitHub** (Settings → Secrets and variables → Actions):
   - `SUPABASE_PROJECT_ID` (já usado no deploy) = `scjxhhkutsiswsgsuiqo`
   - `NAV_SYNC_SECRET` = **o mesmo** valor do secret da função.

3. **Deploy da função**: ao fazer merge para `main`, o workflow
   `deploy-edge-functions.yml` publica a `sync-nav-excel` automaticamente.

## Agendamento

`.github/workflows/nav-daily-sync.yml` corre **todos os dias às 06:00 UTC**.
Podes ajustar o `cron` ou correr manualmente em *Actions → NAV daily sync → Run workflow*.

## A montante (responsabilidade da CCA)

A sincronização só reflete dados novos se o **Excel do NAV for atualizado no
SharePoint** (idealmente um export diário automático para a pasta configurada).
Sem ficheiro novo, sincronizar não altera nada.

## Melhorias futuras (opcional)

- A substituição (apaga→insere) não é transacional; se falhar a meio, os itens
  podem ficar vazios até à corrida seguinte. Envolver numa função SQL
  transacional eliminaria esse risco.
