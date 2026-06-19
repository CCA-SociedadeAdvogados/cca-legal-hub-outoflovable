# Sincronização Intranet → Portal (Notícias SharePoint)

Espelha automaticamente as **Notícias (News)** de um site SharePoint dedicado da
intranet para a tabela `cca_news`, ficando visíveis no Portal do Cliente em
`/portal/novidades`. A entrega é **quase em tempo real** através das *change
notifications* do Microsoft Graph (webhook).

## Arquitetura

```
SharePoint News (site dedicado)
        │  altera/publica notícia
        ▼
Microsoft Graph  ──(change notification)──►  intranet-news-webhook  (Edge Function)
        ▲                                            │
        │  GET sitePages (lê as notícias)            ▼
        └────────────────────────────────────  syncIntranetNews → cca_news
                                                     ▲
   intranet-news-subscribe (cria/renova subscrição + backfill manual)
```

- A notícia publicada na intranet aparece no portal sem intervenção.
- Idempotente: cada página da intranet corresponde a **uma** linha em `cca_news`
  (`source='intranet'`, `external_id` = id da página).
- As notícias manuais (`source='manual'`) continuam a funcionar como antes.

## Pré-requisitos (Azure / Microsoft Graph)

A app do Azure já usada para o SharePoint (`SHAREPOINT_*`) precisa da permissão
**de aplicação**:

- `Sites.Read.All` (ou `Sites.Selected` com acesso ao site da intranet) — ler
  as páginas/notícias.
- `Subscription` é gerida pela própria app; não requer permissão adicional além
  do acesso ao recurso.

> Confirmar com quem gere o tenant e conceder *admin consent*.

## Variáveis de ambiente (Supabase → Edge Functions → Secrets)

| Secret | Descrição |
| --- | --- |
| `SHAREPOINT_TENANT_ID` | já existente (reutilizado) |
| `SHAREPOINT_CLIENT_ID` | já existente (reutilizado) |
| `SHAREPOINT_CLIENT_SECRET` | já existente (reutilizado) |
| `INTRANET_NEWS_SITE_ID` | **novo** — Site ID do SharePoint da intranet de notícias a clientes |
| `INTRANET_SYNC_SECRET` | **novo** — segredo partilhado (≤128 chars). Usado como `clientState` das notificações e para autorizar o endpoint de gestão |
| `INTRANET_NEWS_WEBHOOK_URL` | opcional — por omissão deriva de `SUPABASE_URL` (`…/functions/v1/intranet-news-webhook`) |

Como obter o **Site ID**:
`GET https://graph.microsoft.com/v1.0/sites/{hostname}:/sites/{caminho}` →
campo `id` (formato `host,siteCollectionId,siteId`).

## Deploy

```bash
supabase db push                              # aplica a migração (colunas + tabela)
supabase functions deploy intranet-news-webhook
supabase functions deploy intranet-news-subscribe
```

## Ativação (criar a subscrição + backfill inicial)

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/intranet-news-subscribe?action=subscribe" \
  -H "x-admin-secret: $INTRANET_SYNC_SECRET"
```

Resposta esperada: `{ subscription: { action, subscriptionId, expirationDateTime }, sync: { fetched, inserted, updated } }`.

## Renovação da subscrição

A subscrição de uma *list* SharePoint expira em ~30 dias; renovamos a cada 7 dias.
Agendar uma chamada periódica (ex.: a cada 3 dias) — via *Scheduled Functions* do
Supabase, pg_cron + pg_net, ou um cron externo:

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/intranet-news-subscribe?action=renew" \
  -H "x-admin-secret: $INTRANET_SYNC_SECRET"
```

## Operações úteis

| Ação | Comando |
| --- | --- |
| Sincronizar agora (sem mexer na subscrição) | `?action=sync` |
| Remover a subscrição | `?action=unsubscribe` |

## Notas de segurança

- O webhook é público mas só age sobre notificações cujo `clientState` coincide
  com `INTRANET_SYNC_SECRET`.
- O endpoint de gestão exige o header `x-admin-secret`.
- A tabela `intranet_news_subscription` tem RLS ativa sem políticas (apenas a
  *service role* das Edge Functions lhe acede).
- As notícias da intranet entram como `estado='publicado'`; garantir que o site
  configurado contém **apenas** comunicações destinadas a clientes.
