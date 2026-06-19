// Lógica de sincronização Intranet (SharePoint News) → cca_news.
// Partilhada entre a função de webhook e a de gestão de subscrição.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { getGraphToken, graphGet, graphPost, graphDelete } from "./graph.ts";

// SharePoint list: expiração máxima ~30 dias. Renovamos a cada poucos dias.
const SUBSCRIPTION_TTL_MINUTES = 7 * 24 * 60; // 7 dias

export function getSiteId(): string {
  const siteId = Deno.env.get("INTRANET_NEWS_SITE_ID");
  if (!siteId) throw new Error("INTRANET_NEWS_SITE_ID não configurado");
  return siteId;
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
  const siteId = getSiteId();
  const pages = await fetchPublishedNews(token, siteId);

  let inserted = 0;
  let updated = 0;

  for (const page of pages) {
    const externalId = page.id as string;
    const row = {
      titulo: (page.title as string) || "(sem título)",
      resumo: (page.description as string) || null,
      conteudo: extractContent(page),
      estado: "publicado",
      data_publicacao: (page.lastModifiedDateTime as string) ?? new Date().toISOString(),
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

  await admin
    .from("intranet_news_subscription")
    .update({ last_synced_at: new Date().toISOString() })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  return { fetched: pages.length, inserted, updated };
}

// ─── Subscrição de notificações ───────────────────────────────────────────────

// Resolve o id da biblioteca "Site Pages" (onde vivem as notícias).
async function resolveSitePagesListId(token: string, siteId: string): Promise<string> {
  const res = await graphGet<{ value: Array<{ id: string; displayName?: string; list?: { template?: string } }> }>(
    token,
    `/sites/${siteId}/lists?$select=id,displayName,list&$top=100`,
  );
  const byTemplate = res.value.find((l) => l.list?.template === "sitePagePublishing");
  if (byTemplate) return byTemplate.id;
  const byName = res.value.find((l) => l.displayName === "Site Pages");
  if (byName) return byName.id;
  throw new Error("Biblioteca 'Site Pages' não encontrada no site da intranet");
}

export interface SubscriptionResult {
  action: "created" | "renewed";
  subscriptionId: string;
  expirationDateTime: string;
}

export async function createOrRenewSubscription(admin: SupabaseClient): Promise<SubscriptionResult> {
  const token = await getGraphToken();
  const siteId = getSiteId();
  const listId = await resolveSitePagesListId(token, siteId);
  const resource = `sites/${siteId}/lists/${listId}`;
  const expirationDateTime = new Date(Date.now() + SUBSCRIPTION_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: existing } = await admin
    .from("intranet_news_subscription")
    .select("id, subscription_id")
    .limit(1)
    .maybeSingle();

  // Tentar renovar a subscrição existente
  if (existing?.subscription_id) {
    try {
      const renewed = await graphPatch(token, `/subscriptions/${existing.subscription_id}`, {
        expirationDateTime,
      });
      await admin
        .from("intranet_news_subscription")
        .update({ expiration_at: renewed.expirationDateTime, resource, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return {
        action: "renewed",
        subscriptionId: existing.subscription_id,
        expirationDateTime: renewed.expirationDateTime,
      };
    } catch (_e) {
      // Subscrição expirou/foi removida no Graph — criar nova abaixo
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

  return {
    action: "created",
    subscriptionId: created.id,
    expirationDateTime: created.expirationDateTime,
  };
}

export async function deleteSubscription(admin: SupabaseClient): Promise<void> {
  const token = await getGraphToken();
  const { data: existing } = await admin
    .from("intranet_news_subscription")
    .select("id, subscription_id")
    .limit(1)
    .maybeSingle();
  if (!existing?.subscription_id) return;
  await graphDelete(token, `/subscriptions/${existing.subscription_id}`);
  await admin.from("intranet_news_subscription").delete().eq("id", existing.id);
}

// PATCH não existe no helper partilhado (raro) — implementado localmente.
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
