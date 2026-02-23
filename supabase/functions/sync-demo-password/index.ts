import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const demoEmail = Deno.env.get('DEMO_USER_EMAIL');
    const demoPassword = Deno.env.get('DEMO_USER_PASSWORD');

    // SECURITY: Verify caller is authenticated and is a platform admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Sync-Demo-Password] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller's identity using the anon key
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !caller) {
      console.error('[Sync-Demo-Password] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is a platform admin
    const { data: isPlatformAdmin, error: adminError } = await supabaseAdmin.rpc('is_platform_admin', { _user_id: caller.id });
    if (adminError || !isPlatformAdmin) {
      console.error('[Sync-Demo-Password] Caller is not platform admin:', caller.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Platform admin access required' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Sync-Demo-Password] Authorized platform admin:', caller.email);

    if (!demoEmail || !demoPassword) {
      return new Response(JSON.stringify({ 
        error: 'Demo credentials not configured' 
      }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // Find demo user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const demoUser = users.users.find(u => u.email === demoEmail);
    if (!demoUser) {
      return new Response(JSON.stringify({ 
        error: 'Demo user not found' 
      }), {
        status: 404,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    console.log('[Sync-Demo-Password] Found demo user, syncing password');

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      demoUser.id,
      { password: demoPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    console.log('[Sync-Demo-Password] Successfully synced password for demo user');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo password synced successfully'
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});