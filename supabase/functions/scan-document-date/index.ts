/**
 * scan-document-date
 *
 * Accepts a document (PDF or image) in base64 and returns the emission date
 * extracted by Claude Vision. Works for any language and any document type —
 * digital PDFs, scanned images, foreign documents, etc.
 *
 * Request body:
 *   { file_base64: string, file_name: string, mime_type: string }
 *
 * Response:
 *   { emission_date: "YYYY-MM-DD" | null, confidence: "high" | "low" | "none" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const SYSTEM_PROMPT = `You are a document date extractor. Your ONLY task is to find the emission/issue date of the document provided.

Rules:
- Look for labels such as: "Data:", "Emitido em:", "Date:", "Issued:", "Fecha:", "Datum:", "Date d'émission:", "Data di emissione:", etc.
- For Portuguese government certificates, the emission date is usually near the top of the document.
- Return the date in ISO format YYYY-MM-DD regardless of the original format.
- If you find multiple dates, return the emission/issue date (not an expiry/validity date).
- Confidence "high" = date label is explicit. "low" = inferred from context. "none" = no date found.
- Respond ONLY with valid JSON. No explanation, no markdown.

JSON format:
{"emission_date": "YYYY-MM-DD", "confidence": "high"}
or
{"emission_date": null, "confidence": "none"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { file_base64, file_name, mime_type } = await req.json() as {
      file_base64: string;
      file_name: string;
      mime_type: string;
    };

    if (!file_base64) {
      return new Response(JSON.stringify({ error: "file_base64 obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const isPdf = mime_type === "application/pdf" || file_name?.toLowerCase().endsWith(".pdf");
    const isImage = mime_type?.startsWith("image/");

    if (!isPdf && !isImage) {
      return new Response(
        JSON.stringify({ emission_date: null, confidence: "none", reason: "unsupported_format" }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Build Anthropic message — PDF as document block, image as image block
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file_base64 } }
      : { type: "image", source: { type: "base64", media_type: mime_type, data: file_base64 } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              { type: "text", text: "Extract the emission/issue date from this document." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[scan-document-date] Anthropic error:", response.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ emission_date: null, confidence: "none", reason: "ai_error" }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text?.trim() ?? "";

    // Parse Claude response — strip markdown fences if present
    let parsed: { emission_date: string | null; confidence: string } = { emission_date: null, confidence: "none" };
    try {
      const jsonStr = rawText.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn("[scan-document-date] Could not parse Claude response:", rawText.slice(0, 200));
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[scan-document-date] Unexpected error:", err);
    return new Response(
      JSON.stringify({ emission_date: null, confidence: "none", reason: "internal_error" }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
