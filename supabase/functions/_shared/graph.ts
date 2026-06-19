// Helpers partilhados para o Microsoft Graph (client-credentials flow).
// Reutiliza a app do Azure já configurada para o SharePoint (SHAREPOINT_*).

const GRAPH = "https://graph.microsoft.com/v1.0";

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
  const res = await fetch(
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
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Graph GET falhou (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function graphPost<T = any>(token: string, pathOrUrl: string, body: unknown): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const res = await fetch(url, {
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
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Graph DELETE falhou (${res.status}): ${await res.text()}`);
  }
}
