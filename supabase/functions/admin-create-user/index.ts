import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message || 'No user found' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const { data: isPlatformAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_platform_admin', {
      _user_id: callingUser.id
    });

    if (adminCheckError || !isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only platform admins can create users' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const {
      email,
      nome_completo,
      organizationId,
      role,
      departamento,
      password,
      departmentIds, // NEW: array of department UUIDs
    } = await req.json();

    if (!email || !nome_completo || !organizationId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, nome_completo, organizationId, role' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (password && password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'A palavra-passe deve ter pelo menos 8 caracteres' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      const { data: existingMember } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('user_id', existingAuthUser.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'Este utilizador já é membro desta organização' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (existingProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({ current_organization_id: organizationId, onboarding_completed: true })
          .eq('id', existingAuthUser.id);
      } else {
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: existingAuthUser.id,
            email: existingAuthUser.email,
            nome_completo: nome_completo.trim(),
            current_organization_id: organizationId,
            onboarding_completed: true,
          });
      }

      // Add to organization (trigger will auto-assign "Geral")
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({ organization_id: organizationId, user_id: existingAuthUser.id, role });

      if (memberError) {
        return new Response(
          JSON.stringify({ error: `Erro ao adicionar utilizador à organização: ${memberError.message}` }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // If specific depts provided, add them (trigger already added "Geral")
      if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
        const deptInserts = departmentIds.map((deptId: string) => ({
          user_id: existingAuthUser.id,
          organization_id: organizationId,
          department_id: deptId,
        }));
        await supabaseAdmin.from('user_departments').upsert(deptInserts, { onConflict: 'user_id,organization_id,department_id' });
      }

      return new Response(
        JSON.stringify({
          success: true,
          existingUser: true,
          user: { id: existingAuthUser.id, email: existingAuthUser.email, nome_completo: nome_completo.trim() },
          message: 'Utilizador existente adicionado à organização.',
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const userPassword = password || generateSecurePassword();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: { nome_completo: nome_completo.trim() },
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar utilizador: ${createError?.message}` }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        nome_completo: nome_completo.trim(),
        departamento: departamento || null,
        current_organization_id: organizationId,
        onboarding_completed: true,
      }, { onConflict: 'id' });

    if (profileError) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Add to organization — trigger will auto-assign "Geral"
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: newUser.user.id, role });

    if (memberError) {
      return new Response(
        JSON.stringify({ error: `Erro ao adicionar utilizador à organização: ${memberError.message}` }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // If specific depts provided, add them beyond "Geral"
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const deptInserts = departmentIds.map((deptId: string) => ({
        user_id: newUser.user!.id,
        organization_id: organizationId,
        department_id: deptId,
      }));
      await supabaseAdmin.from('user_departments').upsert(deptInserts, { onConflict: 'user_id,organization_id,department_id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email: newUser.user.email, nome_completo: nome_completo.trim() },
        credentials: { email: newUser.user.email, password: userPassword },
        message: 'Utilizador criado com sucesso',
      }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getCorsHeaders(req: Request) {
  return corsHeaders;
}
