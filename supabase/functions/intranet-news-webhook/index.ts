// Webhook do Microsoft Graph para notícias da intranet (SharePoint News).
//
// Dois modos:
//  1. Handshake de validação: o Graph faz um pedido com ?validationToken=... e
//     espera a devolução do token em text/plain (usado na criação da subscrição).
//  2. Notificação: o Graph envia POST com { value: [...] } quando há alterações.
//     Validamos o clientState e despoletamos a sincronização para cca_news.
//
// Público (verify_jwt = false) — o Graph não envia JWT do Supabase. A autenticidade
// é garantida pelo clientState partilhado (INTRANET_SYNC_SECRET).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncIntranetNews, getClientState } from "../_shared/intranetNews.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const EdgeRuntime: any;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. Handshake de validação (criação/renovação da subscrição)
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  // 2. Notificação
  let body: { value?: Array<{ clientState?: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const notifications = body?.value ?? [];
  let expected: string | null = null;
  try {
    expected = getClientState();
  } catch {
    expected = null;
  }

  // Validar clientState — ignora (mas confirma 202) notificações não autênticas.
  // Fail-closed: se o segredo não estiver configurado (expected === null), rejeita
  // tudo. Caso contrário, um segredo em falta tornaria o webhook aberto a qualquer um.
  const authentic =
    expected !== null &&
    notifications.length > 0 &&
    notifications.every((n) => n.clientState === expected);
  if (!authentic) {
    return new Response(null, { status: 202 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const work = syncIntranetNews(admin).catch((e) =>
    console.error("[intranet-news-webhook] sync error:", e?.message ?? e),
  );

  // Responder rápido ao Graph e processar em segundo plano quando suportado
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }

  return new Response(null, { status: 202 });
});
