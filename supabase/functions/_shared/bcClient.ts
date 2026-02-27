import { PAFlowRequest, PAFlowResponse } from "./types.ts";

const FLOW_TIMEOUT_MS = 25_000; // 25 s — abaixo do limite de 30 s das Edge Functions

/**
 * Chama o Power Automate Flow que serve de proxy ao Business Central.
 * Inclui timeout, logging e tratamento de erros consistente.
 */
export async function callPAFlow<T>(
  payload: PAFlowRequest
): Promise<PAFlowResponse<T>> {
  const flowUrl = Deno.env.get("PA_BC_FLOW_URL");
  const apiKey = Deno.env.get("PA_API_KEY");

  if (!flowUrl) {
    throw new Error("PA_BC_FLOW_URL secret não está configurado");
  }

  console.log(`[bcClient] action=${payload.action} customerNo=${payload.customerNo ?? "-"}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

  try {
    const response = await fetch(flowUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[bcClient] Flow HTTP ${response.status}: ${text}`);
      throw new Error(`Power Automate Flow respondeu com ${response.status}: ${text}`);
    }

    const data: PAFlowResponse<T> = await response.json();

    if (!data.success) {
      console.error(`[bcClient] Flow error: ${data.error}`);
      throw new Error(data.error ?? "Erro desconhecido do Power Automate Flow");
    }

    console.log(`[bcClient] Recebidos ${data.data?.length ?? 0} registos`);
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout após ${FLOW_TIMEOUT_MS / 1000} s a chamar o Power Automate Flow`);
    }
    throw err;
  }
}
