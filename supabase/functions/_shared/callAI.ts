// Helper partilhado para chamadas à Anthropic Messages API.
//
// Centraliza o fetch + tratamento de erro + extração de texto que estava
// duplicado em ~14 Edge Functions. O comportamento é o mesmo que existia
// em cada `callClaude` local (modelo passado pelo chamador).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Retry com backoff exponencial para erros transitórios (429 / 5xx / rede).
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Atraso de backoff para a tentativa N (1-based), com jitter. */
function backoffDelay(attempt: number): number {
  const exp = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return exp + Math.floor(Math.random() * 250);
}

/** Lê o header Retry-After (segundos) e converte para ms, com teto. */
function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (!Number.isFinite(secs) || secs < 0) return null;
  return Math.min(secs * 1000, MAX_DELAY_MS);
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CallClaudeOptions {
  apiKey: string;
  model: string;
  system: string;
  /** Mensagem única de utilizador (atalho para messages: [{ role:"user", content:user }]). */
  user?: string;
  /** Conversa multi-turno (alternativa a `user`). */
  messages?: ClaudeMessage[];
  maxTokens: number;
}

/**
 * Chama a Anthropic Messages API e devolve o texto da primeira parte da resposta.
 * Aceita uma mensagem única (`user`) ou uma conversa (`messages`).
 *
 * Resiliência: tenta novamente em erros transitórios (429, 5xx ou falha de rede)
 * com backoff exponencial, respeitando o header Retry-After. O caminho de sucesso
 * e os erros não-transitórios (4xx) mantêm o comportamento anterior — lança erro
 * com a mesma mensagem.
 */
export async function callClaude({
  apiKey,
  model,
  system,
  user,
  messages,
  maxTokens,
}: CallClaudeOptions): Promise<string> {
  const finalMessages: ClaudeMessage[] = messages ?? [
    { role: "user", content: user ?? "" },
  ];
  const requestBody = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    messages: finalMessages,
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: requestBody,
      });
    } catch (networkErr) {
      // Falha de rede — transitória.
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr));
      if (attempt < MAX_ATTEMPTS) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw lastError;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (!text) throw new Error("Claude retornou resposta vazia");
      return text;
    }

    const errBody = await res.text();
    const isTransient = res.status === 429 || res.status >= 500;
    lastError = new Error(`Claude API ${res.status}: ${errBody.slice(0, 400)}`);

    if (isTransient && attempt < MAX_ATTEMPTS) {
      const wait = retryAfterMs(res.headers.get("retry-after")) ?? backoffDelay(attempt);
      console.warn(
        `[callAI] ${res.status} (tentativa ${attempt}/${MAX_ATTEMPTS}) — nova tentativa em ${wait}ms`,
      );
      await sleep(wait);
      continue;
    }

    // Erro não-transitório (4xx) ou esgotadas as tentativas.
    throw lastError;
  }

  throw lastError ?? new Error("Claude API: falha após várias tentativas");
}
