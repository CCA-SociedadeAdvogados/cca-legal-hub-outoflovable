-- Fix onboarding: allow creating org + membership via SECURITY DEFINER RPC

create or replace function public.create_organization(
  p_name text,
  p_slug text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Ensure profile exists (some environments may not have auth trigger installed)
  insert into public.profiles (id, email, nome_completo)
  values (v_user_id, (select email from auth.users where id = v_user_id), (select coalesce(raw_user_meta_data ->> 'nome_completo', email) from auth.users where id = v_user_id))
  on conflict (id) do nothing;

  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_user_id, 'owner');

  update public.profiles
  set current_organization_id = v_org.id
  where id = v_user_id;

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;