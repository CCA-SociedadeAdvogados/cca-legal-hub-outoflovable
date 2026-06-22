import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
      organizationId: organizationIdRaw,
      jvris_id,
      role,
      departamento,
      password,
      departmentIds, // NEW: array of department UUIDs
    } = await req.json();

    if (!email || !nome_completo || (!organizationIdRaw && !jvris_id) || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, nome_completo, role, and either organizationId or jvris_id' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Resolve organizationId from jvris_id if not provided directly
    let organizationId = organizationIdRaw;
    if (!organizationId && jvris_id) {
      const { data: orgByJvris, error: jvrisError } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('jvris_id', jvris_id.trim())
        .maybeSingle();

      if (jvrisError || !orgByJvris) {
        return new Response(
          JSON.stringify({ error: `Nenhuma organização encontrada com jvris_id: ${jvris_id}` }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      organizationId = orgByJvris.id;
    }

    if (password && password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'A palavra-passe deve ter pelo menos 8 caracteres' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch up to 10 000 users to reliably detect duplicate emails
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 });
    const existingAuthUser = (existingUsers?.users ?? []).find(
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

/** Inteiro uniforme em [0, max) usando RNG criptográfico, sem viés de módulo. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + special;
  const pick = (set: string) => set[randomInt(set.length)];

  const chars = [pick(uppercase), pick(lowercase), pick(numbers), pick(special)];
  for (let i = 0; i < 8; i++) {
    chars.push(pick(allChars));
  }
  // Fisher–Yates com RNG criptográfico
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function getCorsHeaders(req: Request) {
  return corsHeaders(req);
}
