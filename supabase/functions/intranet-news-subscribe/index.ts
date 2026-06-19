// Gestão da subscrição de notícias da intranet (criar/renovar/remover) e
// sincronização manual (backfill). Endpoint administrativo.
//
// Protegido por segredo partilhado no header `x-admin-secret` (INTRANET_SYNC_SECRET),
// já que verify_jwt = false. Pensado para ser chamado:
//   - manualmente pelo administrador (criação inicial / backfill)
//   - por um agendador (renovação periódica antes da expiração da subscrição)
//
// Ações (query string ?action=):
//   subscribe   (default) — cria ou renova a subscrição + faz backfill
//   renew                  — igual a subscribe (idempotente)
//   sync                   — apenas sincroniza as notícias agora
//   unsubscribe            — remove a subscrição

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions, jsonOk, jsonError } from "../_shared/response.ts";
import {
  createOrRenewSubscriptions,
  deleteSubscriptions,
  syncIntranetNews,
} from "../_shared/intranetNews.ts";

Deno.serve(async (req: Request) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const secret = Deno.env.get("INTRANET_SYNC_SECRET");
  const provided = req.headers.get("x-admin-secret");
  if (!secret || provided !== secret) {
    return jsonError("Não autorizado", req, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const action = new URL(req.url).searchParams.get("action") ?? "subscribe";

  try {
    if (action === "subscribe" || action === "renew") {
      const subscriptions = await createOrRenewSubscriptions(admin);
      const sync = await syncIntranetNews(admin);
      return jsonOk({ subscriptions, sync }, req);
    }
    if (action === "sync") {
      return jsonOk(await syncIntranetNews(admin), req);
    }
    if (action === "unsubscribe") {
      const removed = await deleteSubscriptions(admin);
      return jsonOk({ ok: true, removed }, req);
    }
    return jsonError(`Ação desconhecida: ${action}`, req, 400);
  } catch (e) {
    return jsonError((e as Error).message, req, 500);
  }
});
