import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is platform admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // Check if caller is platform admin
    const { data: isPlatformAdmin } = await supabaseAdmin.rpc('is_platform_admin', { _user_id: caller.id });
    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Not authorized - platform admin required' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const { userId, newEmail, newName, newPassword } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    console.log(`Updating user ${userId}${newEmail ? ` email to ${newEmail}` : ''}${newPassword ? ' with new password' : ''}`);

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (newEmail) {
      updateData.email = newEmail;
      updateData.email_confirm = true;
    }
    if (newName) {
      updateData.user_metadata = { nome_completo: newName };
    }
    if (newPassword) {
      updateData.password = newPassword;
    }

    // Update in auth.users
    const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (authUpdateError) {
      console.error('Error updating auth user:', authUpdateError);
      return new Response(JSON.stringify({ error: authUpdateError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // Update profile if email or name changed
    if (newEmail || newName) {
      const profileUpdate: Record<string, unknown> = {};
      if (newEmail) profileUpdate.email = newEmail;
      if (newName) profileUpdate.nome_completo = newName;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`Successfully updated user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User updated successfully`,
      user: authUpdateData.user
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
