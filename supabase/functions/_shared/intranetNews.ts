// Lógica de sincronização Intranet (SharePoint News) → cca_news.
// Partilhada entre a função de webhook e a de gestão de subscrição.
//
// Fonte: um ou mais sites/secções SharePoint, cada um mapeado a setor(es).
// O setor da notícia é inferido pela origem (site) — ver INTRANET_NEWS_SOURCES.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { getGraphToken, graphGet, graphPost, graphDelete } from "./graph.ts";

// SharePoint list: expiração máxima ~30 dias. Renovamos a cada 7 dias.
const SUBSCRIPTION_TTL_MINUTES = 7 * 24 * 60;

export interface NewsSource {
  siteId: string;
  /** Setores associados a esta fonte. Vazio = geral (visível a todos). */
  sectors: string[];
}

/**
 * Fontes de notícias. Configuradas via INTRANET_NEWS_SOURCES (JSON):
 *   [{ "siteId": "...", "sectors": ["ambiente_energia_residuos"] },
 *    { "siteId": "...", "sectors": [] }]
 * Retrocompatível: INTRANET_NEWS_SITE_ID define uma única fonte geral.
 */
export function getSources(): NewsSource[] {
  const raw = Deno.env.get("INTRANET_NEWS_SOURCES");
  if (raw) {
    const parsed = JSON.parse(raw) as Array<{ siteId: string; sectors?: string[] }>;
    return parsed
      .filter((s) => s?.siteId)
      .map((s) => ({ siteId: s.siteId, sectors: Array.isArray(s.sectors) ? s.sectors : [] }));
  }
  const single = Deno.env.get("INTRANET_NEWS_SITE_ID");
  if (single) return [{ siteId: single, sectors: [] }];
  throw new Error("Configurar INTRANET_NEWS_SOURCES (JSON) ou INTRANET_NEWS_SITE_ID");
}

function getWebhookUrl(): string {
  const explicit = Deno.env.get("INTRANET_NEWS_WEBHOOK_URL");
  if (explicit) return explicit;
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("SUPABASE_URL não disponível para derivar o webhook URL");
  return `${base}/functions/v1/intranet-news-webhook`;
}

export function getClientState(): string {
  const secret = Deno.env.get("INTRANET_SYNC_SECRET");
  if (!secret) throw new Error("INTRANET_SYNC_SECRET não configurado");
  return secret.slice(0, 128);
}

// ─── Conteúdo das páginas ─────────────────────────────────────────────────────

function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6]|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractContent(page: any): string {
  const parts: string[] = [];
  const sections = page?.canvasLayout?.horizontalSections ?? [];
  for (const section of sections) {
    for (const column of section?.columns ?? []) {
      for (const wp of column?.webParts ?? []) {
        const inner = wp?.innerHtml ?? wp?.data?.innerHTML ?? wp?.data?.properties?.text;
        if (typeof inner === "string") {
          const text = htmlToText(inner);
          if (text) parts.push(text);
        }
      }
    }
  }
  const content = parts.join("\n\n").trim();
  return content || htmlToText(page?.description) || "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPublishedNews(token: string, siteId: string): Promise<any[]> {
  const res = await graphGet<{ value: unknown[] }>(
    token,
    `/sites/${siteId}/pages/microsoft.graph.sitePage?$expand=canvasLayout&$top=50`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.value ?? []).filter((p: any) => {
    const isNews = p?.promotionKind === "newsPost";
    const isPublished = p?.publishingState?.level === "published";
    return isNews && isPublished;
  });
}

// ─── Sincronização ────────────────────────────────────────────────────────────

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
}

export async function syncIntranetNews(admin: SupabaseClient): Promise<SyncResult> {
  const token = await getGraphToken();
  const sources = getSources();

  let fetched = 0;
  let inserted = 0;
  let updated = 0;

  for (const source of sources) {
    const pages = await fetchPublishedNews(token, source.siteId);
    fetched += pages.length;

    for (const page of pages) {
      const externalId = page.id as string;
      const row = {
        titulo: (page.title as string) || "(sem título)",
        resumo: (page.description as string) || null,
        conteudo: extractContent(page),
        estado: "publicado",
        data_publicacao: (page.lastModifiedDateTime as string) ?? new Date().toISOString(),
        sectors: source.sectors,
        source: "intranet",
        external_id: externalId,
        external_url: (page.webUrl as string) ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await admin
        .from("cca_news")
        .select("id")
        .eq("source", "intranet")
        .eq("external_id", externalId)
        .maybeSingle();

      if (existing) {
        await admin.from("cca_news").update(row).eq("id", existing.id);
        updated++;
      } else {
        await admin.from("cca_news").insert(row);
        inserted++;
      }
    }
  }

  await admin
    .from("intranet_news_subscription")
    .update({ last_synced_at: new Date().toISOString() })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  return { fetched, inserted, updated };
}

// ─── Subscrições de notificações (uma por fonte/site) ─────────────────────────

// Resolve o id da biblioteca "Site Pages" (onde vivem as notícias) de um site.
async function resolveSitePagesListId(token: string, siteId: string): Promise<string> {
  const res = await graphGet<{ value: Array<{ id: string; displayName?: string; list?: { template?: string } }> }>(
    token,
    `/sites/${siteId}/lists?$select=id,displayName,list&$top=100`,
  );
  const byTemplate = res.value.find((l) => l.list?.template === "sitePagePublishing");
  if (byTemplate) return byTemplate.id;
  const byName = res.value.find((l) => l.displayName === "Site Pages");
  if (byName) return byName.id;
  throw new Error(`Biblioteca 'Site Pages' não encontrada no site ${siteId}`);
}

export interface SubscriptionResult {
  resource: string;
  action: "created" | "renewed";
  subscriptionId: string;
  expirationDateTime: string;
}

export async function createOrRenewSubscriptions(admin: SupabaseClient): Promise<SubscriptionResult[]> {
  const token = await getGraphToken();
  const sources = getSources();
  const results: SubscriptionResult[] = [];

  for (const source of sources) {
    const listId = await resolveSitePagesListId(token, source.siteId);
    const resource = `sites/${source.siteId}/lists/${listId}`;
    const expirationDateTime = new Date(Date.now() + SUBSCRIPTION_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: existing } = await admin
      .from("intranet_news_subscription")
      .select("id, subscription_id")
      .eq("resource", resource)
      .maybeSingle();

    if (existing?.subscription_id) {
      try {
        const renewed = await graphPatch(token, `/subscriptions/${existing.subscription_id}`, {
          expirationDateTime,
        });
        await admin
          .from("intranet_news_subscription")
          .update({ expiration_at: renewed.expirationDateTime, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        results.push({
          resource,
          action: "renewed",
          subscriptionId: existing.subscription_id,
          expirationDateTime: renewed.expirationDateTime,
        });
        continue;
      } catch (_e) {
        await admin.from("intranet_news_subscription").delete().eq("id", existing.id);
      }
    }

    const created = await graphPost(token, `/subscriptions`, {
      changeType: "updated",
      notificationUrl: getWebhookUrl(),
      resource,
      expirationDateTime,
      clientState: getClientState(),
    });

    await admin.from("intranet_news_subscription").insert({
      subscription_id: created.id,
      resource,
      expiration_at: created.expirationDateTime,
      client_state: getClientState(),
    });

    results.push({
      resource,
      action: "created",
      subscriptionId: created.id,
      expirationDateTime: created.expirationDateTime,
    });
  }

  return results;
}

export async function deleteSubscriptions(admin: SupabaseClient): Promise<number> {
  const token = await getGraphToken();
  const { data: rows } = await admin
    .from("intranet_news_subscription")
    .select("id, subscription_id");

  let removed = 0;
  for (const row of rows ?? []) {
    if (row.subscription_id) await graphDelete(token, `/subscriptions/${row.subscription_id}`);
    await admin.from("intranet_news_subscription").delete().eq("id", row.id);
    removed++;
  }
  return removed;
}

// PATCH não consta do helper partilhado (uso raro) — implementado localmente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphPatch(token: string, path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph PATCH falhou (${res.status}): ${await res.text()}`);
  return res.json();
}
