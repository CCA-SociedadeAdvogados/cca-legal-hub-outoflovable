// Helpers partilhados para o Microsoft Graph (client-credentials flow).
// Reutiliza a app do Azure já configurada para o SharePoint (SHAREPOINT_*).

const GRAPH = "https://graph.microsoft.com/v1.0";

// fetch com retry para throttling/indisponibilidade transitória do Graph.
// 429/503/504 são repetidos com backoff exponencial, honrando o Retry-After
// quando presente. Sem isto, um único 429 numa sync grande abortava tudo.
export async function graphFetch(
  url: string | URL,
  init?: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status !== 503 && res.status !== 504) {
      return res;
    }
    if (attempt >= maxRetries) {
      return res;
    }
    const retryAfter = Number(res.headers.get("Retry-After"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 10_000)
      : Math.min(2 ** attempt * 1000, 10_000);
    // Consumir o body antes de repetir para libertar a ligação
    try { await res.body?.cancel(); } catch { /* noop */ }
    console.warn(`[graphFetch] ${res.status} em ${String(url).slice(0, 120)} — retry ${attempt + 1}/${maxRetries} em ${delayMs}ms`);
    await new Promise((r) => setTimeout(r, delayMs));
    attempt++;
  }
}

export function graphEnv() {
  const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
  const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
  const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Configuração Graph em falta: SHAREPOINT_TENANT_ID / SHAREPOINT_CLIENT_ID / SHAREPOINT_CLIENT_SECRET",
    );
  }
  return { tenantId, clientId, clientSecret };
}

export async function getGraphToken(): Promise<string> {
  const { tenantId, clientId, clientSecret } = graphEnv();
  const res = await graphFetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }).toString(),
    },
  );
  if (!res.ok) {
    throw new Error(`Falha ao obter token Graph: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function graphGet<T = any>(token: string, pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const res = await graphFetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Graph GET falhou (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function graphPost<T = any>(token: string, pathOrUrl: string, body: unknown): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const res = await graphFetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Graph POST falhou (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function graphDelete(token: string, pathOrUrl: string): Promise<void> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const res = await graphFetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Graph DELETE falhou (${res.status}): ${await res.text()}`);
  }
}
