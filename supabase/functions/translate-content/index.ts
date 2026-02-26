import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLang, context } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Filter empty texts and track their indices
    interface TextEntry { text: string; index: number; isEmpty: boolean; }
    const textEntries: TextEntry[] = texts.map((t: string, i: number) => ({ text: t, index: i, isEmpty: !t?.trim() }));
    const nonEmptyTexts = textEntries.filter((e: TextEntry) => !e.isEmpty).map((e: TextEntry) => e.text);

    if (nonEmptyTexts.length === 0) {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetLanguage = targetLang === 'en' ? 'English' : 'Portuguese';
    const systemPrompt = `You are a professional translator specializing in legal and corporate content. 
Translate the following texts to ${targetLanguage}.
Context: ${context || 'general content'}

IMPORTANT RULES:
- Return ONLY a valid JSON array of strings, nothing else
- Maintain the exact same order as the input
- Keep proper nouns, company names, acronyms, and technical terms unchanged
- Preserve any formatting like line breaks
- Be concise and professional`;

    console.log(`Translating ${nonEmptyTexts.length} texts to ${targetLanguage}`);

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(nonEmptyTexts) }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Translation service unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No translation content received");
    }

    // Parse the JSON array from the response
    let translatedArray: string[];
    try {
      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      translatedArray = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse translation response:", content);
      // Fallback: return original texts
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reconstruct array with empty texts preserved
    let translatedIdx = 0;
    const translations = texts.map((t: string) => {
      if (!t?.trim()) return t;
      return translatedArray[translatedIdx++] || t;
    });

    console.log(`Successfully translated ${nonEmptyTexts.length} texts`);

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});