// Helper partilhado para chamadas à Anthropic Messages API.
//
// Centraliza o fetch + tratamento de erro + extração de texto que estava
// duplicado em ~14 Edge Functions. O comportamento é o mesmo que existia
// em cada `callClaude` local (modelo passado pelo chamador).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface ClaudeMessage {
  role: "user" | "assistant";
  // string (texto) ou array de blocos de conteúdo (text/image/document) para visão/OCR.
  content: string | unknown[];
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
  /** Cabeçalho anthropic-beta (ex.: "pdfs-2024-09-25" para blocos document PDF). */
  betaHeader?: string;
}

/**
 * Chama a Anthropic Messages API e devolve o texto da primeira parte da resposta.
 * Aceita uma mensagem única (`user`) ou uma conversa (`messages`).
 * Lança erro em respostas não-OK ou vazias (igual ao comportamento anterior).
 */
export async function callClaude({
  apiKey,
  model,
  system,
  user,
  messages,
  maxTokens,
  betaHeader,
}: CallClaudeOptions): Promise<string> {
  const finalMessages: ClaudeMessage[] = messages ?? [
    { role: "user", content: user ?? "" },
  ];
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      ...(betaHeader ? { "anthropic-beta": betaHeader } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: finalMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Claude retornou resposta vazia");
  return text;
}
