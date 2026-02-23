import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Input validation constants
const MAX_EMAIL_LENGTH = 320; // RFC 5321 maximum
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const VALID_ACTIONS = ["check_lockout", "record_attempt", "reset_lockout"] as const;

// Validation helpers
function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (typeof email !== "string") {
    return { valid: false, error: "email_must_be_string" };
  }
  if (email.length === 0) {
    return { valid: false, error: "email_required" };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: "email_too_long" };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: "email_invalid_format" };
  }
  return { valid: true };
}

function validateAction(action: unknown): { valid: boolean; error?: string } {
  if (typeof action !== "string") {
    return { valid: false, error: "action_must_be_string" };
  }
  if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return { valid: false, error: "action_invalid" };
  }
  return { valid: true };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    if (typeof body !== "object" || body === null) {
      return new Response(
        JSON.stringify({ error: "invalid_request_body" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const { email, action, success } = body as Record<string, unknown>;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // Validate action
    const actionValidation = validateAction(action);
    if (!actionValidation.valid) {
      return new Response(
        JSON.stringify({ error: actionValidation.error }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const validatedEmail = email as string;
    const validatedAction = action as string;

    console.log(`[Secure-Login] Action: ${validatedAction} for email: ${validatedEmail.substring(0, 3)}***`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, login_attempts, locked_until")
      .eq("email", validatedEmail)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error(`[Secure-Login] Profile error: ${profileError.message}`);
    }

    // Handle different actions
    switch (validatedAction) {
      case "check_lockout": {
        // Return generic response to prevent email enumeration
        if (!profile) {
          return new Response(
            JSON.stringify({
              locked: false,
              attempts: 0,
              max_attempts: MAX_LOGIN_ATTEMPTS,
            }),
            {
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        // Check if user is locked out
        if (profile?.locked_until) {
          const lockedUntil = new Date(profile.locked_until);
          if (lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
            console.log(`[Secure-Login] User locked for ${remainingMinutes} more minutes`);
            return new Response(
              JSON.stringify({
                locked: true,
                locked_until: profile.locked_until,
                remaining_minutes: remainingMinutes,
                message: `Conta bloqueada. Tente novamente em ${remainingMinutes} minutos.`,
              }),
              {
                status: 423,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
              }
            );
          } else {
            // Lockout expired - reset
            await supabase
              .from("profiles")
              .update({ locked_until: null, login_attempts: 0 })
              .eq("id", profile.id);
          }
        }

        return new Response(
          JSON.stringify({
            locked: false,
            attempts: profile?.login_attempts || 0,
            max_attempts: MAX_LOGIN_ATTEMPTS,
          }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      case "record_attempt": {
        // Validate success parameter for record_attempt
        if (typeof success !== "boolean") {
          return new Response(
            JSON.stringify({ error: "success_must_be_boolean" }),
            {
              status: 400,
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        if (!profile) {
          // User doesn't exist in profiles - log anyway but don't reveal this
          console.log(`[Secure-Login] User not found in profiles`);
          return new Response(
            JSON.stringify({ recorded: true }),
            {
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }

        if (success) {
          // Successful login - reset attempts and update last login
          console.log(`[Secure-Login] Successful login recorded`);
          
          await supabase
            .from("profiles")
            .update({
              login_attempts: 0,
              locked_until: null,
              last_login_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          // Log successful auth
          await supabase.from("auth_activity_logs").insert([{
            user_id: profile.id,
            auth_method: "local",
            action: "login",
            success: true,
            user_agent: req.headers.get("user-agent")?.substring(0, 500) || null,
          }]);

          return new Response(
            JSON.stringify({
              recorded: true,
              attempts_reset: true,
            }),
            {
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        } else {
          // Failed login - increment attempts
          const newAttempts = (profile.login_attempts || 0) + 1;
          console.log(`[Secure-Login] Failed login attempt ${newAttempts}/${MAX_LOGIN_ATTEMPTS}`);

          const updates: Record<string, unknown> = {
            login_attempts: newAttempts,
          };

          // Lock account if max attempts reached
          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
            updates.locked_until = lockoutUntil.toISOString();
            console.log(`[Secure-Login] Account locked until: ${lockoutUntil.toISOString()}`);
          }

          await supabase
            .from("profiles")
            .update(updates)
            .eq("id", profile.id);

          // Log failed auth
          await supabase.from("auth_activity_logs").insert([{
            user_id: profile.id,
            auth_method: "local",
            action: "failed_login",
            success: false,
            user_agent: req.headers.get("user-agent")?.substring(0, 500) || null,
            metadata: { attempt_number: newAttempts },
          }]);

          return new Response(
            JSON.stringify({
              recorded: true,
              attempts: newAttempts,
              max_attempts: MAX_LOGIN_ATTEMPTS,
              locked: newAttempts >= MAX_LOGIN_ATTEMPTS,
              locked_until: updates.locked_until || null,
            }),
            {
              headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
          );
        }
      }

      case "reset_lockout": {
        // Admin action to reset lockout - don't reveal if user exists
        if (profile) {
          await supabase
            .from("profiles")
            .update({
              login_attempts: 0,
              locked_until: null,
            })
            .eq("id", profile.id);

          console.log(`[Secure-Login] Lockout reset`);
        }

        return new Response(
          JSON.stringify({ reset: true }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "unknown_action" }),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
    }

  } catch (error: unknown) {
    console.error(`[Secure-Login] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro interno do servidor",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
