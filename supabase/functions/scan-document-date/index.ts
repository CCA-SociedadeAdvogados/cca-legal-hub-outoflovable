// scan-document-date
// Accepts a document (PDF or image) in base64, returns emission date via Claude Vision.
// Body: { file_base64: string, file_name: string, mime_type: string }
// Response: { emission_date: "YYYY-MM-DD" | null, confidence: "high" | "low" | "none" }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders as _baseCorsHeaders } from "../_shared/cors.ts";

function corsHeaders(req: Request): Record<string, string> {
  return {
    ..._baseCorsHeaders(req),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SYSTEM_PROMPT = `You are a document date extractor. Your task is to find the emission/issue date AND the validity/expiry date of the document provided.

Rules:
- Look for emission labels: "Data:", "Emitido em:", "Date:", "Issued:", "Data de emissão:", etc.
- Look for validity/expiry labels: "Válido até:", "Válida até:", "Data de validade:", "Expiry:", "Valid until:", "Válido por:", etc.
- For Portuguese government certificates (Certidão Permanente, RCBE, etc.), the emission date is usually near the top. The validity date may appear explicitly or be stated as a period (e.g. "válida por 12 meses").
- If a validity period is stated (e.g. "válida por 12 meses" or "valid for 1 year"), calculate the absolute validity date from the emission date.
- Return all dates in ISO format YYYY-MM-DD regardless of the original format.
- If you find multiple dates, distinguish emission from validity carefully.
- Confidence "high" = date label is explicit. "low" = inferred from context. "none" = no date found.
- Respond ONLY with valid JSON. No explanation, no markdown.

JSON format (include validity_date when found):
{"emission_date": "YYYY-MM-DD", "validity_date": "YYYY-MM-DD", "confidence": "high"}
or if only emission date found:
{"emission_date": "YYYY-MM-DD", "validity_date": null, "confidence": "high"}
or if nothing found:
{"emission_date": null, "validity_date": null, "confidence": "none"}`;

serve(async (req) => {
  console.log("[scan-document-date] handler invoked, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    console.log("[scan-document-date] checking API key");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      console.error("[scan-document-date] ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    console.log("[scan-document-date] parsing request body");
    let body: { file_base64: string; file_name: string; mime_type: string };
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[scan-document-date] failed to parse body:", parseErr);
      return new Response(JSON.stringify({ error: "invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { file_base64, file_name, mime_type } = body;
    console.log("[scan-document-date] file:", file_name, "mime:", mime_type, "b64 len:", file_base64?.length ?? 0);

    if (!file_base64) {
      return new Response(JSON.stringify({ error: "file_base64 obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const isPdf = mime_type === "application/pdf" || file_name?.toLowerCase().endsWith(".pdf");
    const isImage = mime_type?.startsWith("image/");
    console.log("[scan-document-date] isPdf:", isPdf, "isImage:", isImage);

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

    const requestHeaders: Record<string, string> = {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    };
    // PDF document blocks require the beta header
    if (isPdf) {
      requestHeaders["anthropic-beta"] = "pdfs-2024-09-25";
    }

    console.log("[scan-document-date] calling Anthropic, model: claude-sonnet-4-6");
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                contentBlock,
                { type: "text", text: "Extract the emission/issue date and validity/expiry date from this document. If the document states a validity period (e.g. 'válida por 12 meses'), calculate the absolute expiry date from the emission date." },
              ],
            },
          ],
        }),
      });
    } catch (fetchErr) {
      console.error("[scan-document-date] fetch to Anthropic failed:", fetchErr);
      return new Response(
        JSON.stringify({ emission_date: null, confidence: "none", reason: "network_error" }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    console.log("[scan-document-date] Anthropic status:", response.status);
    if (!response.ok) {
      const errText = await response.text();
      console.error("[scan-document-date] Anthropic error body:", errText.slice(0, 500));
      return new Response(
        JSON.stringify({ emission_date: null, confidence: "none", reason: "ai_error", detail: `HTTP ${response.status}: ${errText.slice(0, 300)}` }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text?.trim() ?? "";
    console.log("[scan-document-date] raw Claude response:", rawText.slice(0, 300));

    // Parse Claude response — strip markdown fences if present
    let parsed: { emission_date: string | null; confidence: string } = { emission_date: null, confidence: "none" };
    try {
      const jsonStr = rawText.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn("[scan-document-date] could not parse Claude response:", rawText.slice(0, 200));
    }

    console.log("[scan-document-date] result:", JSON.stringify(parsed));
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[scan-document-date] unexpected error:", String(err));
    return new Response(
      JSON.stringify({ emission_date: null, confidence: "none", reason: "internal_error", detail: String(err) }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
