import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const _allowedOrigins = (Deno.env.get("ALLOWED_ORIGIN") ?? "*").split(",").map((s: string) => s.trim());
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = _allowedOrigins.includes("*")
    ? "*"
    : _allowedOrigins.includes(origin)
    ? origin
    : _allowedOrigins[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Esta função foi desactivada. A análise de triagem passou a ser feita
// exclusivamente pelo agente externo CCA (GPT-4o) via callCCAAgent.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Esta função foi desactivada. A análise é feita pelo agente externo CCA.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    }
  );
});
