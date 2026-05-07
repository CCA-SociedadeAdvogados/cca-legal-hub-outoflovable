const _rawAllowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const _allowedOrigins = _rawAllowed
  .split(",")
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 0);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  // Fail-closed: se ALLOWED_ORIGIN não estiver definido, devolve a primeira
  // origem da lista (string vazia) — nunca "*". O navegador irá bloquear o
  // pedido, o que é o comportamento seguro em produção.
  const allow = _allowedOrigins.includes(origin)
    ? origin
    : _allowedOrigins[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}
