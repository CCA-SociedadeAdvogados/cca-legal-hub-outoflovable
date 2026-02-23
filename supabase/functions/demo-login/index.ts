import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Security: Demo login is disabled by default.
// Enable by setting DEMO_LOGIN_ENABLED=true (case-insensitive) in secrets.
function isDemoEnabled(): boolean {
  const raw = (Deno.env.get("DEMO_LOGIN_ENABLED") ?? "").trim();
  console.log(`[Demo-Login] DEMO_LOGIN_ENABLED raw value: "${raw}"`);
  return /^(true|1|yes|on)$/i.test(raw);
}

function getDemoCredentials(): { email: string; password: string } {
  return {
    email: (Deno.env.get("DEMO_USER_EMAIL") ?? "").trim(),
    password: Deno.env.get("DEMO_USER_PASSWORD") ?? "",
  };
}

// Demo tenant bootstrap (keeps demo access frictionless)
const DEMO_ORG_SLUG = "demo";
const DEMO_ORG_NAME = "Organização Demo";

async function ensureDemoTenant(
  // Note: Edge Functions don't have DB types available here; use `any` to avoid `never` inference.
  supabaseAdmin: any,
  userId: string,
  email: string | null,
) {
  console.log(`[Demo-Login] ensureDemoTenant starting for user ${userId}`);

  // 1) Clean up old memberships from other organizations (ensures fresh demo state)
  const { data: oldMemberships, error: oldMembershipsError } = await supabaseAdmin
    .from("organization_members")
    .select("id, organization_id, organizations!inner(slug)")
    .eq("user_id", userId);

  if (oldMembershipsError) {
    console.log(`[Demo-Login] Warning: Could not fetch old memberships: ${oldMembershipsError.message}`);
  } else if (oldMemberships && oldMemberships.length > 0) {
    // Remove memberships from non-demo organizations
    const nonDemoMemberships = oldMemberships.filter(
      (m: any) => m.organizations?.slug !== DEMO_ORG_SLUG
    );
    
    if (nonDemoMemberships.length > 0) {
      console.log(`[Demo-Login] Removing ${nonDemoMemberships.length} old membership(s) from non-demo orgs`);
      const idsToRemove = nonDemoMemberships.map((m: any) => m.id);
      const { error: deleteError } = await supabaseAdmin
        .from("organization_members")
        .delete()
        .in("id", idsToRemove);
      
      if (deleteError) {
        console.log(`[Demo-Login] Warning: Could not remove old memberships: ${deleteError.message}`);
      }
    }
  }

  // 2) Ensure demo organization exists
  const { data: existingOrg, error: orgSelectError } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_ORG_SLUG)
    .maybeSingle();

  if (orgSelectError) throw orgSelectError;

  let orgId = existingOrg?.id as string | undefined;

  if (!orgId) {
    console.log(`[Demo-Login] Creating demo organization "${DEMO_ORG_NAME}"`);
    const { data: createdOrg, error: orgInsertError } = await supabaseAdmin
      .from("organizations")
      .insert({ name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG })
      .select("id")
      .single();

    if (orgInsertError) throw orgInsertError;
    orgId = createdOrg.id as string;
    console.log(`[Demo-Login] Demo organization created with id: ${orgId}`);
  } else {
    console.log(`[Demo-Login] Demo organization already exists with id: ${orgId}`);
  }

  // 3) Ensure the profile is marked as onboarded and linked to demo org
  console.log(`[Demo-Login] Upserting profile with current_organization_id: ${orgId}`);
  const { error: profileUpsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        auth_method: "demo",
        onboarding_completed: true,
        current_organization_id: orgId,
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) throw profileUpsertError;

  // 4) Ensure membership exists (admin role in organization)
  const { data: existingMembership, error: membershipSelectError } = await supabaseAdmin
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipSelectError) throw membershipSelectError;

  if (!existingMembership) {
    console.log(`[Demo-Login] Creating admin membership in demo organization`);
    const { error: membershipInsertError } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: userId, role: "admin" });

    if (membershipInsertError) throw membershipInsertError;
  } else {
    console.log(`[Demo-Login] User already has membership in demo organization`);
  }

  // 5) Ensure demo user is a platform admin (superadmin)
  const { data: existingPlatformAdmin, error: platformAdminSelectError } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (platformAdminSelectError) throw platformAdminSelectError;

  if (!existingPlatformAdmin) {
    console.log(`[Demo-Login] Adding user as platform admin (superadmin)`);
    const { error: platformAdminInsertError } = await supabaseAdmin
      .from("platform_admins")
      .insert({ user_id: userId, notes: "Demo superadmin account" });

    if (platformAdminInsertError) throw platformAdminInsertError;
  } else {
    console.log(`[Demo-Login] User is already a platform admin`);
  }

  console.log(`[Demo-Login] ensureDemoTenant completed successfully`);
  return { orgId };
}

// Rate limiting: max 10 demo logins per IP per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_DEMO_LOGINS_PER_WINDOW = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= MAX_DEMO_LOGINS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

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
    const clientIP = getClientIP(req);
    
    // Check if demo login is enabled
    if (!isDemoEnabled()) {
      console.log(`[Demo-Login] Demo login disabled. IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: "demo_disabled",
          message: "O login demo está desativado neste ambiente.",
        }),
        {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const { email: demoEmail, password: demoPassword } = getDemoCredentials();

    // Validate demo credentials are configured
    if (!demoEmail || !demoPassword) {
      console.error("[Demo-Login] Demo credentials not configured");
      return new Response(
        JSON.stringify({
          error: "demo_not_configured",
          message: "O login demo não está configurado.",
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      console.log(`[Demo-Login] Rate limited. IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: "rate_limited",
          message: `Demasiadas tentativas. Tente novamente em ${rateLimit.retryAfter} segundos.`,
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: { 
            ...getCorsHeaders(req), 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter)
          },
        }
      );
    }

    console.log(`[Demo-Login] Attempting demo login. IP: ${clientIP}`);

    // Create Supabase client for auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use anon client for sign in (same as frontend would)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    
    // Attempt sign in with demo credentials
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (error) {
      console.error(`[Demo-Login] Auth error: ${error.message}`);
      return new Response(
        JSON.stringify({ 
          error: "auth_failed",
          message: "Erro ao iniciar sessão demo. Contacte o administrador."
        }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // Log successful demo login for audit
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin.from("auth_activity_logs").insert([{
      user_id: data.user?.id || null,
      auth_method: "demo",
      action: "login",
      success: true,
      ip_address: clientIP,
      user_agent: req.headers.get("user-agent")?.substring(0, 500) || null,
      metadata: {
        login_type: "demo_account",
        note: "Demo login via secure edge function",
      },
    }]);

    // Demo access must be instant: ensure onboarding + organization are auto-configured
    if (data.user?.id) {
      await ensureDemoTenant(supabaseAdmin as any, data.user.id, data.user.email ?? null);
    }

    console.log(`[Demo-Login] Success. User: ${data.user?.id}`);

    // Return session tokens (same format as Supabase auth)
    return new Response(
      JSON.stringify({
        success: true,
        session: data.session,
        user: data.user,
        is_demo: true,
        message: "Sessão demo iniciada com sucesso."
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error(`[Demo-Login] Error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
