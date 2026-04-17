// CORS helper for edge functions.
// SECURITY: Fails closed. If ALLOWED_ORIGIN is not set, no Origin is allowed.
// Set ALLOWED_ORIGIN in Supabase secrets to a comma-separated list of origins,
// e.g. ALLOWED_ORIGIN="https://app.cca-legal.pt,https://staging.cca-legal.pt".
// The literal "*" is permitted only when DEV=true (local development).

const _devMode = (Deno.env.get("DEV") ?? "").toLowerCase() === "true";
const _rawAllowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const _allowedOrigins = _rawAllowed
  .split(",")
  .map((s: string) => s.trim())
  .filter((s) => s.length > 0);

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version";

function resolveAllowedOrigin(origin: string): string | null {
  if (_allowedOrigins.length === 0) {
    // Fail closed in production. Allow * only in dev mode.
    return _devMode ? "*" : null;
  }
  if (_allowedOrigins.includes("*")) {
    if (_devMode) return "*";
    // "*" never allowed outside dev — pick first concrete origin instead
    const concrete = _allowedOrigins.find((o) => o !== "*");
    return concrete ?? null;
  }
  if (origin && _allowedOrigins.includes(origin)) return origin;
  return null;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = resolveAllowedOrigin(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allow !== null) {
    headers["Access-Control-Allow-Origin"] = allow;
  }
  return headers;
}

/**
 * Returns true when the request's Origin is allowed. Functions can call this
 * to short-circuit non-preflight requests that come from disallowed origins.
 */
export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin") ?? "";
  // Same-origin / non-browser callers (curl, server-to-server) often omit Origin.
  if (!origin) return true;
  return resolveAllowedOrigin(origin) !== null;
}
