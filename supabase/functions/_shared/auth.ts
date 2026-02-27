import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { BCResponse } from "./types.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, " +
    "x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Devolve uma Response JSON normalizada com CORS. */
export function jsonResponse<T>(
  body: BCResponse<T>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Devolve uma resposta de erro normalizada. */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}

/** Responde ao preflight OPTIONS. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Valida o JWT do utilizador a partir do header Authorization.
 * Devolve { user, supabaseAdmin } se válido, ou lança erro.
 */
export async function validateAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verificar o JWT com o anon client
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: invalid token");
  }

  // Criar client de serviço para operações privilegiadas (cache)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  return { user, supabaseAdmin };
}
