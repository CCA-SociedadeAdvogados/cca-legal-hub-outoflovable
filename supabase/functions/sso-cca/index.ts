import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SSO CCA Configuration (to be set via secrets)
const SSO_CONFIG = {
  clientId: Deno.env.get("CCA_SSO_CLIENT_ID") || "",
  clientSecret: Deno.env.get("CCA_SSO_CLIENT_SECRET") || "",
  issuerUrl: Deno.env.get("CCA_SSO_ISSUER_URL") || "",
  redirectUrl: Deno.env.get("CCA_SSO_REDIRECT_URL") || "",
  allowedDomains: (Deno.env.get("CCA_SSO_ALLOWED_DOMAINS") || "cca.pt,cca-law.com").split(",").map(d => d.trim().toLowerCase()),
  defaultRole: "viewer",
};

// Input validation constants
const MAX_CODE_LENGTH = 2048;
const MAX_STATE_LENGTH = 128;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Decode JWT ID token payload (signature already validated by token exchange)
function decodeIdToken(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    // Handle URL-safe base64
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Decode base64 to binary string
    const binaryString = atob(payload);
    // Convert binary string to Uint8Array for proper UTF-8 decoding
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Decode UTF-8 bytes to string (handles multi-byte chars like "í")
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Generate and store state in database for persistence across instances
// deno-lint-ignore no-explicit-any
async function generateAndStoreState(supabase: any): Promise<{ state: string; nonce: string }> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  const { error } = await supabase.from("sso_states").insert({
    state,
    nonce,
  });
  
  if (error) {
    console.error("[SSO-CCA] Failed to store state:", error.message);
    throw new Error("Failed to generate state");
  }
  
  return { state, nonce };
}

// Validate and consume state (one-time use) - prevents replay attacks
// deno-lint-ignore no-explicit-any
async function validateAndConsumeState(supabase: any, state: string): Promise<{ valid: boolean; error?: string }> {
  // Delete and return the state atomically - ensures one-time use
  const { data, error } = await supabase
    .from("sso_states")
    .delete()
    .eq("state", state)
    .gt("expires_at", new Date().toISOString())
    .select()
    .maybeSingle();
  
  if (error) {
    console.error("[SSO-CCA] Database error validating state:", error.message);
    return { valid: false, error: "state_validation_error" };
  }
  
  if (!data) {
    return { valid: false, error: "state_not_found_or_expired" };
  }
  
  return { valid: true };
}

// Validation helpers
function validateCode(code: unknown): { valid: boolean; error?: string } {
  if (typeof code !== "string") {
    return { valid: false, error: "code_must_be_string" };
  }
  if (code.length === 0) {
    return { valid: false, error: "code_required" };
  }
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, error: "code_too_long" };
  }
  // OAuth codes should be alphanumeric with some special chars
  // OAuth codes may contain alphanumeric and URL-safe special chars (including +, /, =, ~)
  if (!/^[a-zA-Z0-9._\-+/=~]+$/.test(code)) {
    return { valid: false, error: "code_invalid_format" };
  }
  return { valid: true };
}

function validateStateFormat(state: unknown): { valid: boolean; error?: string } {
  if (state === null || state === undefined) {
    return { valid: false, error: "state_required" };
  }
  if (typeof state !== "string") {
    return { valid: false, error: "state_must_be_string" };
  }
  if (state.length === 0) {
    return { valid: false, error: "state_required" };
  }
  if (state.length > MAX_STATE_LENGTH) {
    return { valid: false, error: "state_too_long" };
  }
  // State should be UUID format or alphanumeric
  if (!UUID_REGEX.test(state) && !ALPHANUMERIC_REGEX.test(state)) {
    return { valid: false, error: "state_invalid_format" };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[SSO-CCA] Request to: ${path}`);

  // Create Supabase client with service role for all operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if SSO is configured
    if (!SSO_CONFIG.clientId || !SSO_CONFIG.issuerUrl) {
      console.log("[SSO-CCA] SSO not configured - missing client ID or issuer URL");
      return new Response(
        JSON.stringify({
          error: "SSO not configured",
          message: "SSO CCA ainda não está configurado. Por favor, configure as credenciais do IdP.",
          configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /start - Initiate SSO flow
    if (path.endsWith("/start")) {
      console.log("[SSO-CCA] Starting SSO flow");

      // Generate secure state and store in database for persistence
      const { state } = await generateAndStoreState(supabase);
      
      // Build OIDC authorization URL
      // Include GroupMember.Read.All so Microsoft includes groups claim in the ID token
      const authParams = new URLSearchParams({
        client_id: SSO_CONFIG.clientId,
        redirect_uri: SSO_CONFIG.redirectUrl,
        response_type: "code",
        scope: "openid email profile GroupMember.Read.All",
        state: state,
      });

      const authUrl = `${SSO_CONFIG.issuerUrl}/authorize?${authParams.toString()}`;

      console.log(`[SSO-CCA] Redirecting to IdP with state: ${state.substring(0, 8)}...`);

      return new Response(
        JSON.stringify({
          authUrl,
          state,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /callback - Handle SSO callback
    if (path.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      console.log("[SSO-CCA] Callback received");

      if (error) {
        const sanitizedError = error.substring(0, 100).replace(/[^\w\s-]/g, '');
        console.error(`[SSO-CCA] IdP error: ${sanitizedError}`);
        return new Response(
          JSON.stringify({
            error: "sso_error",
            message: "Erro no processo de autenticação SSO",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate state format first
      const stateFormatValidation = validateStateFormat(state);
      if (!stateFormatValidation.valid) {
        console.error(`[SSO-CCA] Invalid state format: ${stateFormatValidation.error}`);
        return new Response(
          JSON.stringify({
            error: "invalid_state",
            message: "Estado de autenticação inválido ou ausente",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate state against database (CSRF protection + one-time use)
      const storedStateValidation = await validateAndConsumeState(supabase, state!);
      if (!storedStateValidation.valid) {
        console.error(`[SSO-CCA] State validation failed: ${storedStateValidation.error}`);
        return new Response(
          JSON.stringify({
            error: "invalid_state",
            message: "Estado de autenticação inválido, expirado ou já utilizado",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate code
      const codeValidation = validateCode(code);
      if (!codeValidation.valid) {
        console.error(`[SSO-CCA] Invalid code: ${codeValidation.error}`);
        return new Response(
          JSON.stringify({
            error: codeValidation.error,
            message: "Código de autorização inválido",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Exchange code for tokens
      console.log("[SSO-CCA] Exchanging code for tokens");
      
      const tokenResponse = await fetch(`${SSO_CONFIG.issuerUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${SSO_CONFIG.clientId}:${SSO_CONFIG.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code!,
          redirect_uri: SSO_CONFIG.redirectUrl,
        }),
      });

      if (!tokenResponse.ok) {
        console.error(`[SSO-CCA] Token exchange failed: ${tokenResponse.status}`);
        return new Response(
          JSON.stringify({
            error: "token_exchange_failed",
            message: "Falha na troca de tokens",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokens = await tokenResponse.json();
      console.log("[SSO-CCA] Tokens received");

      // Extract user info from ID token (Microsoft Entra ID compatible)
      const idToken = tokens.id_token;
      if (!idToken) {
        console.error("[SSO-CCA] No ID token in response");
        return new Response(
          JSON.stringify({
            error: "missing_id_token",
            message: "Token de identificação não recebido do IdP",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const userInfo = decodeIdToken(idToken);
      if (!userInfo) {
        console.error("[SSO-CCA] Failed to decode ID token");
        return new Response(
          JSON.stringify({
            error: "invalid_id_token",
            message: "Falha ao processar token de identificação",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("[SSO-CCA] User info extracted from ID token");

      // Extract email (Microsoft Entra ID uses different claims)
      const email = (userInfo.email || userInfo.preferred_username || userInfo.upn) as string | undefined;
      if (!email || typeof email !== "string") {
        console.error("[SSO-CCA] No email in ID token");
        return new Response(
          JSON.stringify({
            error: "missing_email",
            message: "Email não fornecido pelo IdP",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[SSO-CCA] User info received for: ${email.substring(0, 3)}***`);

      // Extract name (fallback to email prefix)
      const userName = (userInfo.name || email.split("@")[0]) as string;
      
      // Extract external ID (Microsoft uses 'oid', standard OIDC uses 'sub')
      const externalId = String(userInfo.oid || userInfo.sub || "").substring(0, 255);

      // Validate email domain
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (!emailDomain || !SSO_CONFIG.allowedDomains.includes(emailDomain)) {
        console.error(`[SSO-CCA] Domain not allowed: ${emailDomain}`);
        return new Response(
          JSON.stringify({
            error: "domain_not_allowed",
            message: "Domínio de email não autorizado para SSO",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email, nome_completo")
        .eq("email", email)
        .single();

      let userId: string;

      if (existingUser) {
        // User exists - update SSO info
        console.log(`[SSO-CCA] Updating existing user`);
        
        await supabase
          .from("profiles")
          .update({
            auth_method: "sso_cca",
            sso_provider: "cca",
            sso_external_id: externalId,
            nome_completo: userName.substring(0, 255).trim(),
            last_login_at: new Date().toISOString(),
            login_attempts: 0,
            locked_until: null,
          })
          .eq("id", existingUser.id);

        userId = existingUser.id;
      } else {
        // JIT Provisioning - Create new user
        console.log(`[SSO-CCA] Creating new user via JIT`);

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            nome_completo: userName.substring(0, 255).trim(),
            auth_method: "sso_cca",
          },
        });

        if (authError) {
          console.error(`[SSO-CCA] Failed to create auth user`);
          return new Response(
            JSON.stringify({
              error: "user_creation_failed",
              message: "Falha ao criar utilizador",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        userId = authUser.user.id;

        // Update profile with SSO info
        await supabase
          .from("profiles")
          .update({
            auth_method: "sso_cca",
            sso_provider: "cca",
            sso_external_id: externalId,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      // Generate real session for the user
      console.log("[SSO-CCA] Generating session for user");

      // Step 1: Generate magic link hash
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error("[SSO-CCA] Failed to generate link:", linkError?.message);
        return new Response(
          JSON.stringify({
            error: "session_generation_failed",
            message: "Falha ao gerar sessão",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Step 2: Verify OTP to create real session with tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

      if (sessionError || !sessionData?.session) {
        console.error("[SSO-CCA] Failed to verify OTP:", sessionError?.message);
        return new Response(
          JSON.stringify({
            error: "session_verification_failed",
            message: "Falha ao verificar sessão",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Auto-assign SSO users to CCA_Teste organization using SECURITY DEFINER function
      // This bypasses RLS policies that would otherwise block the insert
      const CCA_TESTE_ORG_ID = "e33bf0c9-71b9-491b-8054-d4c88d8bb4ee";

      // Determine role based on Microsoft security groups in the ID token
      // Groups are provided as GUIDs in the 'groups' claim
      // CCA_SSO_GROUP_ADMIN and CCA_SSO_GROUP_MANAGER secrets hold the group GUIDs
      const adminGroupId = Deno.env.get("CCA_SSO_GROUP_ADMIN") || "";
      const managerGroupId = Deno.env.get("CCA_SSO_GROUP_MANAGER") || "";
      
      // Handle Microsoft Entra groups claim overflow (~200+ groups)
      // When overflow occurs, 'groups' is absent and '_claim_names' is present
      let userGroups: string[] = [];
      
      if (Array.isArray(userInfo.groups) && userInfo.groups.length > 0) {
        userGroups = userInfo.groups as string[];
        console.log(`[SSO-CCA] User groups from token claim: ${userGroups.length} groups`);
      } else if (userInfo._claim_names || userInfo.hasgroups) {
        // Groups overflow — fetch from Microsoft Graph API
        console.log(`[SSO-CCA] Groups claim overflow detected (_claim_names present or hasgroups=true), fetching from Graph API`);
        try {
          const graphResponse = await fetch(
            "https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.group?$select=id,displayName&$top=999",
            {
              headers: {
                "Authorization": `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (graphResponse.ok) {
            const graphData = await graphResponse.json();
            userGroups = (graphData.value || []).map((g: { id: string }) => g.id);
            console.log(`[SSO-CCA] Fetched ${userGroups.length} groups from Graph API`);
          } else {
            console.error(`[SSO-CCA] Graph API error: ${graphResponse.status} ${graphResponse.statusText}`);
          }
        } catch (graphErr) {
          console.error(`[SSO-CCA] Failed to fetch groups from Graph API:`, graphErr instanceof Error ? graphErr.message : graphErr);
        }
      } else {
        console.log(`[SSO-CCA] No groups claim and no overflow indicator — user has no groups`);
      }

      console.log(`[SSO-CCA] Final user groups for role mapping: ${JSON.stringify(userGroups.slice(0, 10))}${userGroups.length > 10 ? `... (${userGroups.length} total)` : ""}`);

      let assignedRole = "editor"; // default role for all CCA SSO users
      if (adminGroupId && userGroups.includes(adminGroupId)) {
        assignedRole = "admin";
        console.log(`[SSO-CCA] User is in LegalHub_Admin group → role: admin`);
      } else if (managerGroupId && userGroups.includes(managerGroupId)) {
        assignedRole = "admin";
        console.log(`[SSO-CCA] User is in LegalHub_Manager group → role: admin`);
      } else {
        console.log(`[SSO-CCA] User not in specific groups → default role: editor`);
      }
      
      // Sync platform_admins based on LegalHub_Admin group membership
      const DEMO_USER_ID = "1f7308ec-f9be-4a6a-96d5-b8ec4c98527b";
      const isAdminGroup = adminGroupId && userGroups.includes(adminGroupId);

      if (isAdminGroup) {
        // Upsert into platform_admins — idempotent, safe to call on every login
        const { error: paError } = await supabase
          .from("platform_admins")
          .upsert({ user_id: userId }, { onConflict: "user_id" });
        if (paError) {
          console.error(`[SSO-CCA] Failed to upsert platform_admins:`, paError.message);
        } else {
          console.log(`[SSO-CCA] User added/confirmed in platform_admins (LegalHub_Admin group)`);
        }
      } else {
        // Remove from platform_admins (group revoked in Entra), protecting demo_user
        const { error: paError } = await supabase
          .from("platform_admins")
          .delete()
          .eq("user_id", userId)
          .neq("user_id", DEMO_USER_ID);
        if (paError) {
          console.error(`[SSO-CCA] Failed to remove from platform_admins:`, paError.message);
        } else {
          console.log(`[SSO-CCA] User removed from platform_admins (not in LegalHub_Admin group)`);
        }
      }

      console.log(`[SSO-CCA] Assigning user to CCA_Teste organization via RPC with role: ${assignedRole}`);
      
      const { error: assignError } = await supabase
        .rpc("assign_sso_user_to_organization", {
          p_user_id: userId,
          p_organization_id: CCA_TESTE_ORG_ID,
          p_role: assignedRole
        });

      if (assignError) {
        console.error(`[SSO-CCA] Failed to assign user to CCA_Teste:`, assignError.message);
      } else {
        console.log(`[SSO-CCA] Successfully assigned user to CCA_Teste with role: ${assignedRole}`);
      }

      // Mark onboarding as completed for SSO users — they don't need the onboarding flow
      const { error: onboardingError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          current_organization_id: CCA_TESTE_ORG_ID,
        })
        .eq("id", userId);

      if (onboardingError) {
        console.error(`[SSO-CCA] Failed to mark onboarding complete:`, onboardingError.message);
      } else {
        console.log(`[SSO-CCA] Onboarding marked complete for SSO user`);
      }

      // Log authentication activity
      await supabase.from("auth_activity_logs").insert([{
        user_id: userId,
        auth_method: "sso_cca",
        action: "login",
        success: true,
        metadata: {
          idp: "cca",
        },
      }]);

      console.log(`[SSO-CCA] SSO login successful for user ${userId}`);

      // Return complete session to frontend
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: userId,
            email: email,
            name: userName,
          },
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route: /status - Check SSO configuration status
    if (path.endsWith("/status")) {
      return new Response(
        JSON.stringify({
          configured: !!(SSO_CONFIG.clientId && SSO_CONFIG.issuerUrl),
          domainsConfigured: SSO_CONFIG.allowedDomains.length > 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({ error: "not_found", message: "Endpoint não encontrado" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error(`[SSO-CCA] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "Erro interno do servidor",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
