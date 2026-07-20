-- ============================================================
-- Hub CCA — Fase 1 (docs/hub/blueprint-implementacao.md)
--
-- Implementa, sobre a stack atual, o núcleo do blueprint "Hub CCA —
-- Fluxos, Integrações e Consola" (v1, 03/07/2026):
--   · Secção 4  — base única de eventos (hub_eventos) com texto a duas
--                 camadas, pipeline rascunho→curadoria→publicação,
--                 semântica de estado calculada e visibilidade por tipo;
--   · F1        — grupos de acesso (hub_grupos) + empresas do grupo;
--   · F2        — publicação opt-in de assuntos + status cliente-friendly;
--   · F5        — prazos do portal a partir da mesma base de eventos,
--                 datas contratuais sincronizadas, notificações 7/3/1;
--   · Secção 5  — configuração por cliente (hub_portal_config), acesso
--                 restrito por assunto (hub_user_assuntos) e auditoria.
--
-- Princípio de segurança (o mesmo das timelines tl_*): clientes não têm
-- SELECT direto em hub_eventos — o único caminho são RPCs SECURITY DEFINER
-- que nunca selecionam as colunas internas (titulo_interno,
-- descricao_interna, interno, chave_origem, aprovado_*).
-- ============================================================

-- ── F1 · Grupos de acesso ────────────────────────────────────
-- "O grupo não existe em nenhum sistema de origem — nasce no hub e é a
-- âncora de todas as permissões." Semeado a partir de organizations."group"
-- (legado JVRIS/DealCloud) e confirmado na consola.

create table public.hub_grupos (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  created_by_id uuid,
  created_at timestamptz not null default now()
);

alter table public.organizations
  add column hub_grupo_id uuid references public.hub_grupos(id) on delete set null,
  add column portal_ativa boolean not null default true;   -- nível 2: empresa entra no portal

insert into public.hub_grupos (nome)
select distinct o."group"
from public.organizations o
where o."group" is not null and o."group" <> '' and o.org_type = 'client';

update public.organizations o
   set hub_grupo_id = g.id
  from public.hub_grupos g
 where o."group" = g.nome and o.org_type = 'client';

alter table public.hub_grupos enable row level security;
create policy hub_grupos_cca on public.hub_grupos
  for all using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()))
  with check (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));
-- Membros podem ver o próprio grupo (para o seletor de entidade do portal).
create policy hub_grupos_member_select on public.hub_grupos
  for select using (
    exists (
      select 1 from public.organizations o
      join public.organization_members om on om.organization_id = o.id
      where o.hub_grupo_id = hub_grupos.id and om.user_id = auth.uid()
    )
  );

-- ── Nível 4 · Acesso restrito por assunto ────────────────────
alter table public.organization_members
  add column acesso_restrito boolean not null default false;

create table public.hub_user_assuntos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  assunto_id uuid not null references public.assuntos(id) on delete cascade,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, assunto_id)
);
alter table public.hub_user_assuntos enable row level security;
create policy hua_cca on public.hub_user_assuntos
  for all using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()))
  with check (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));
create policy hua_self_select on public.hub_user_assuntos
  for select using (user_id = auth.uid());

-- Um utilizador restrito só vê os assuntos que lhe foram designados.
create or replace function public.hub_pode_ver_assunto(_assunto_id uuid, _org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when exists (
      select 1 from public.organization_members om
      where om.user_id = auth.uid()
        and om.organization_id = _org_id
        and om.acesso_restrito
    )
    then exists (
      select 1 from public.hub_user_assuntos h
      where h.user_id = auth.uid() and h.assunto_id = _assunto_id
    )
    else true
  end
$$;
revoke all on function public.hub_pode_ver_assunto(uuid, uuid) from public;
grant execute on function public.hub_pode_ver_assunto(uuid, uuid) to authenticated;

-- ── F2 · Assuntos: publicação opt-in + status curado ─────────
alter table public.assuntos
  add column publicado boolean not null default false,
  add column status_cliente text;

-- Retro-compatibilidade: os assuntos existentes já eram visíveis no portal;
-- ficam publicados para não desaparecerem aos clientes. Novos assuntos
-- nascem não publicados ("nada é publicado por defeito").
update public.assuntos set publicado = true;

drop policy if exists assuntos_select on public.assuntos;
create policy assuntos_select on public.assuntos
  for select to authenticated
  using (
    (
      organization_id = public.get_user_organization_id(auth.uid())
      and publicado
      and public.hub_pode_ver_assunto(id, organization_id)
    )
    or public.is_cca_user(auth.uid())
    or public.is_platform_admin(auth.uid())
  );

-- ── Secção 4 · Base única de eventos ─────────────────────────
create table public.hub_eventos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assunto_id uuid references public.assuntos(id) on delete cascade,
  tipo text not null check (tipo in (
    'marco_fase', 'prazo_processual', 'audiencia',
    'data_contratual', 'marco_manual', 'evento_documental'
  )),
  titulo_cliente text not null,          -- publicado; o cliente nunca vê nomenclatura crua
  titulo_interno text,                   -- interno
  descricao_cliente text,
  descricao_interna text,                -- interno; estratégia NUNCA é evento
  data_evento date not null,
  concluido boolean not null default false,
  interno boolean not null default false,      -- prazos internos de preparação: nunca publicáveis
  publicado boolean not null default false,
  requer_acao_cliente boolean not null default false,
  origem text not null default 'manual'
    check (origem in ('jvris', 'clm', 'imanage', 'manual', 'portal', 'timelines')),
  chave_origem text,                     -- chave única por registo de origem (fim dos duplicados)
  aprovado_por uuid references public.profiles(id),
  aprovado_em timestamptz,
  created_by_id uuid,
  updated_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origem, chave_origem)
);

create index hub_eventos_org_idx on public.hub_eventos (organization_id, data_evento desc);
create index hub_eventos_assunto_idx on public.hub_eventos (assunto_id, data_evento desc);
create index hub_eventos_publicados_idx on public.hub_eventos (organization_id, data_evento)
  where publicado;

create trigger trg_hub_eventos_updated_at
  before update on public.hub_eventos
  for each row execute function public.set_updated_at();

-- Guarda: um evento interno nunca pode ser publicado (camada de dados,
-- não UI); publicação carimba aprovador/data automaticamente.
create or replace function public.hub_eventos_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.publicado and new.interno then
    raise exception 'eventos internos nao sao publicaveis';
  end if;
  if new.publicado and (tg_op = 'INSERT' or not coalesce(old.publicado, false)) then
    new.aprovado_por := coalesce(new.aprovado_por, auth.uid());
    new.aprovado_em := coalesce(new.aprovado_em, now());
  end if;
  if not new.publicado then
    new.aprovado_por := null;
    new.aprovado_em := null;
  end if;
  return new;
end;
$$;
create trigger trg_hub_eventos_guard
  before insert or update on public.hub_eventos
  for each row execute function public.hub_eventos_guard();

alter table public.hub_eventos enable row level security;
-- CCA: acesso total. Clientes: SEM select direto — só via RPCs hub_client_*.
create policy hub_eventos_cca on public.hub_eventos
  for all using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()))
  with check (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));

-- Semântica de estado calculada, nunca à mão (Secção 4.3): vencido é
-- distinto de "próximos" e de "concluído".
create or replace function public.hub_estado_evento(_data date, _concluido boolean)
returns text
language sql immutable
as $$
  select case
    when _concluido then 'concluido'
    when _data < current_date then 'vencido'
    when _data = current_date then 'em_curso'
    else 'previsto'
  end
$$;

-- Migração de dados: eventos manuais existentes (assunto_eventos) entram
-- na base única. visivel_cliente→publicado; eventos passados ficam
-- concluídos (para não aparecerem como "vencidos").
insert into public.hub_eventos (
  organization_id, assunto_id, tipo, titulo_cliente, titulo_interno,
  descricao_cliente, data_evento, concluido, publicado, origem,
  chave_origem, created_by_id, created_at
)
select
  ae.organization_id,
  ae.assunto_id,
  case ae.tipo
    when 'documento' then 'evento_documental'
    when 'marco' then 'marco_manual'
    else 'marco_manual'
  end,
  ae.titulo,
  ae.titulo,
  ae.descricao,
  ae.data,
  ae.data <= current_date,
  ae.visivel_cliente,
  'manual',
  'assunto_eventos:' || ae.id::text,
  ae.created_by_id,
  ae.created_at
from public.assunto_eventos ae
on conflict (origem, chave_origem) do nothing;

-- ── RPCs do cliente (único caminho de leitura) ───────────────

-- Timeline de um assunto: passado + futuro, só eventos publicados de
-- assuntos publicados/visíveis. Nunca devolve colunas internas.
create or replace function public.hub_client_timeline(p_assunto uuid)
returns table (
  evento_id uuid, tipo text, titulo text, descricao text,
  data_evento date, estado text, requer_acao_cliente boolean
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.tipo, e.titulo_cliente, e.descricao_cliente,
         e.data_evento, public.hub_estado_evento(e.data_evento, e.concluido),
         e.requer_acao_cliente
  from public.hub_eventos e
  join public.assuntos a on a.id = e.assunto_id
  where e.assunto_id = p_assunto
    and e.publicado
    and a.publicado
    and a.organization_id = public.tl_org()
    and public.hub_pode_ver_assunto(a.id, a.organization_id)
  order by e.data_evento desc, e.created_at desc;
$$;
revoke all on function public.hub_client_timeline(uuid) from public;
grant execute on function public.hub_client_timeline(uuid) to authenticated;

-- Prazos: o futuro de todos os assuntos + vencidos (nunca misturados —
-- o estado vem calculado). Inclui eventos de organização (sem assunto).
create or replace function public.hub_client_prazos()
returns table (
  evento_id uuid, tipo text, titulo text, descricao text,
  data_evento date, estado text, requer_acao_cliente boolean,
  assunto_id uuid, assunto_titulo text
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.tipo, e.titulo_cliente, e.descricao_cliente,
         e.data_evento, public.hub_estado_evento(e.data_evento, e.concluido),
         e.requer_acao_cliente, a.id, a.titulo
  from public.hub_eventos e
  left join public.assuntos a on a.id = e.assunto_id
  where e.publicado
    and not e.concluido
    and e.organization_id = public.tl_org()
    and (
      e.assunto_id is null
      or (a.publicado and public.hub_pode_ver_assunto(a.id, a.organization_id))
    )
  order by e.data_evento asc;
$$;
revoke all on function public.hub_client_prazos() from public;
grant execute on function public.hub_client_prazos() to authenticated;

-- ── Contrato de ingestão (conectores I1–I5 futuros) ──────────
-- Service role apenas. Upsert idempotente por (origem, chave_origem);
-- entra sempre em rascunho (publicado=false) para curadoria, exceto se o
-- evento já estava publicado (atualizações de data mantêm a publicação).
create or replace function public.hub_ingest_evento(
  p_organization_id uuid,
  p_tipo text,
  p_titulo_interno text,
  p_data_evento date,
  p_origem text,
  p_chave_origem text,
  p_assunto_id uuid default null,
  p_titulo_cliente text default null,
  p_interno boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.hub_eventos (
    organization_id, assunto_id, tipo, titulo_cliente, titulo_interno,
    data_evento, interno, origem, chave_origem
  ) values (
    p_organization_id, p_assunto_id, p_tipo,
    coalesce(p_titulo_cliente, p_titulo_interno), p_titulo_interno,
    p_data_evento, p_interno, p_origem, p_chave_origem
  )
  on conflict (origem, chave_origem) do update
    set data_evento = excluded.data_evento,
        titulo_interno = excluded.titulo_interno,
        updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.hub_ingest_evento(uuid, text, text, date, text, text, uuid, text, boolean) from public;
grant execute on function public.hub_ingest_evento(uuid, text, text, date, text, text, uuid, text, boolean) to service_role;

-- ── F5 · Datas contratuais → eventos (CLM-lite) ──────────────
-- Datas de termo e de decisão de renovação dos contratos ativos entram na
-- base de eventos como 'data_contratual' (publicáveis por defeito, conforme
-- Secção 4.3). Idempotente; corre diariamente via pg_cron.
create or replace function public.fn_sync_contratos_hub_eventos()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select c.id, c.organization_id, c.titulo_contrato, c.data_termo,
           c.data_limite_decisao_renovacao
    from public.contratos c
    join public.organizations o on o.id = c.organization_id
    where c.estado_contrato = 'activo'
      and coalesce(c.arquivado, false) = false
      and o.org_type = 'client'
  loop
    if r.data_termo is not null and r.data_termo >= current_date then
      insert into public.hub_eventos (
        organization_id, tipo, titulo_cliente, titulo_interno,
        data_evento, origem, chave_origem, publicado
      ) values (
        r.organization_id, 'data_contratual',
        'Termo do contrato — ' || r.titulo_contrato,
        'Termo do contrato — ' || r.titulo_contrato,
        r.data_termo, 'clm', 'contrato:' || r.id::text || ':termo', true
      )
      on conflict (origem, chave_origem) do update
        set data_evento = excluded.data_evento, updated_at = now();
      v_count := v_count + 1;
    end if;
    if r.data_limite_decisao_renovacao is not null
       and r.data_limite_decisao_renovacao >= current_date then
      insert into public.hub_eventos (
        organization_id, tipo, titulo_cliente, titulo_interno,
        data_evento, origem, chave_origem, publicado
      ) values (
        r.organization_id, 'data_contratual',
        'Decisão de renovação — ' || r.titulo_contrato,
        'Decisão de renovação — ' || r.titulo_contrato,
        r.data_limite_decisao_renovacao, 'clm',
        'contrato:' || r.id::text || ':renovacao', true
      )
      on conflict (origem, chave_origem) do update
        set data_evento = excluded.data_evento, updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.fn_sync_contratos_hub_eventos() from public;
grant execute on function public.fn_sync_contratos_hub_eventos() to service_role;

-- Sincronização inicial ANTES de criar o trigger de notificação — o
-- backfill histórico não deve gerar notificações aos clientes.
select public.fn_sync_contratos_hub_eventos();

-- ── F5 · Notificações 7/3/1 dias ─────────────────────────────
-- Para eventos publicados e não concluídos, gera notificações aos
-- utilizadores do portal (auth local) a 7, 3 e 1 dias da data.
create or replace function public.fn_create_hub_prazo_notifications()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, metadata)
  select om.user_id, e.organization_id,
         'prazo_evento_' || (e.data_evento - current_date)::text,
         'Prazo próximo',
         e.titulo_cliente || ' — ' || to_char(e.data_evento, 'DD/MM/YYYY'),
         'hub_evento', e.id,
         jsonb_build_object('dias', e.data_evento - current_date, 'tipo', e.tipo)
  from public.hub_eventos e
  join public.organization_members om on om.organization_id = e.organization_id
  join public.profiles p on p.id = om.user_id and p.auth_method = 'local'
  where e.publicado
    and not e.concluido
    and e.data_evento - current_date in (7, 3, 1)
    and (
      e.assunto_id is null
      or exists (select 1 from public.assuntos a where a.id = e.assunto_id and a.publicado)
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = om.user_id
        and n.reference_id = e.id
        and n.type = 'prazo_evento_' || (e.data_evento - current_date)::text
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.fn_create_hub_prazo_notifications() from public;
grant execute on function public.fn_create_hub_prazo_notifications() to service_role;

-- Notificação na publicação de um evento (motor de notificações F8-lite).
create or replace function public.hub_notify_evento_publicado()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.publicado and (tg_op = 'INSERT' or not coalesce(old.publicado, false)) then
    insert into public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id)
    select om.user_id, new.organization_id, 'hub_evento_publicado',
           'Nova atualização', new.titulo_cliente, 'hub_evento', new.id
    from public.organization_members om
    join public.profiles p on p.id = om.user_id and p.auth_method = 'local'
    where om.organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
create trigger trg_hub_eventos_notify
  after insert or update on public.hub_eventos
  for each row execute function public.hub_notify_evento_publicado();

-- ── Marco de fase automático (timelines → hub) ───────────────
-- Concluir uma fase de uma timeline de processo gera um evento
-- 'marco_fase' em rascunho para curadoria; reverter remove o rascunho
-- não publicado. (Secção 4.1: "Origem: auto, rascunho → texto curado".)
create or replace function public.tl_set_phase(p_instance_phase uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  v_org uuid;
  v_matter text;
begin
  if not public.tl_is_lawyer() then
    raise exception 'not authorized';
  end if;
  if p_estado not in ('pendente', 'ativa', 'concluida') then
    raise exception 'estado invalido';
  end if;
  update public.tl_instance_phases
     set estado = p_estado,
         data_conclusao = case when p_estado = 'concluida' then current_date else null end
   where id = p_instance_phase;

  select p.label, i.org_id, i.matter_ref
    into v_label, v_org, v_matter
  from public.tl_instance_phases ip
  join public.tl_phases p on p.id = ip.phase_id
  join public.tl_instances i on i.id = ip.instance_id
  where ip.id = p_instance_phase;

  if p_estado = 'concluida' then
    insert into public.hub_eventos (
      organization_id, tipo, titulo_cliente, titulo_interno,
      data_evento, concluido, origem, chave_origem, created_by_id
    ) values (
      v_org, 'marco_fase', v_label,
      coalesce(v_matter || ' — ', '') || v_label,
      current_date, true, 'timelines', 'tl:' || p_instance_phase::text, auth.uid()
    )
    on conflict (origem, chave_origem) do nothing;
  else
    delete from public.hub_eventos
     where origem = 'timelines'
       and chave_origem = 'tl:' || p_instance_phase::text
       and not publicado;
  end if;
end;
$$;

-- ── Secção 5 · Configuração do portal por cliente ────────────
-- Nível 1 do modelo de permissões: abas e funcionalidades por organização
-- (a consola pode aplicar a mesma configuração a todo o grupo).
create table public.hub_portal_config (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  abas jsonb not null default '{
    "contratos": true, "assuntos": true, "timelines": true,
    "documentos": true, "prazos": true, "financeiro": true,
    "pedidos": true, "novidades": true, "politicas": true
  }'::jsonb,
  funcionalidades jsonb not null default '{
    "ics": true, "upload_documentos": true, "ocultar_valores": false
  }'::jsonb,
  updated_by_id uuid,
  updated_at timestamptz not null default now()
);
create trigger trg_hub_portal_config_updated_at
  before update on public.hub_portal_config
  for each row execute function public.set_updated_at();

alter table public.hub_portal_config enable row level security;
create policy hpc_cca on public.hub_portal_config
  for all using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()))
  with check (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));
-- O cliente lê a configuração da própria org (para o portal esconder abas).
create policy hpc_member_select on public.hub_portal_config
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = hub_portal_config.organization_id
        and om.user_id = auth.uid()
    )
  );

-- ── Auditoria (Secção 5: "tudo fica em auditoria") ───────────
-- Alterações do hub (publicações, configuração, permissões) registadas em
-- audit_logs; leitura pela consola via RPC gated a CCA.
create or replace function public.hub_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_org uuid;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
begin
  select p.email into v_email from public.profiles p where p.id = auth.uid();
  -- Acesso só via jsonb: nem todas as tabelas auditadas têm as mesmas colunas.
  v_org := coalesce(
    (v_new->>'organization_id')::uuid,
    (v_old->>'organization_id')::uuid
  );
  insert into public.audit_logs (user_id, user_email, organization_id, action, table_name, record_id, old_data, new_data)
  values (
    coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    v_email,
    v_org,
    lower(tg_op), tg_table_name,
    coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid,
             (v_new->>'organization_id')::uuid, (v_old->>'organization_id')::uuid,
             (v_new->>'assunto_id')::uuid, (v_old->>'assunto_id')::uuid),
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_hub_eventos_audit
  after insert or update or delete on public.hub_eventos
  for each row execute function public.hub_audit();
create trigger trg_hub_portal_config_audit
  after insert or update or delete on public.hub_portal_config
  for each row execute function public.hub_audit();
create trigger trg_hub_user_assuntos_audit
  after insert or delete on public.hub_user_assuntos
  for each row execute function public.hub_audit();

-- Leitura da auditoria do hub pela consola (só CCA).
create or replace function public.hub_auditoria_list(p_org uuid, p_limit int default 50)
returns table (
  id uuid, user_email text, action text, table_name text,
  record_id uuid, new_data jsonb, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select l.id, l.user_email, l.action, l.table_name, l.record_id, l.new_data, l.created_at
  from public.audit_logs l
  where (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()))
    and l.organization_id = p_org
    and l.table_name in ('hub_eventos', 'hub_portal_config', 'hub_user_assuntos', 'assuntos')
  order by l.created_at desc
  limit least(p_limit, 200);
$$;
revoke all on function public.hub_auditoria_list(uuid, int) from public;
grant execute on function public.hub_auditoria_list(uuid, int) to authenticated;

-- ── Agendamento ──────────────────────────────────────────────
create extension if not exists pg_cron;
select cron.schedule('hub-sync-contratos', '0 6 * * *',
  $$select public.fn_sync_contratos_hub_eventos()$$);
select cron.schedule('hub-prazos-notificacoes', '0 7 * * *',
  $$select public.fn_create_hub_prazo_notifications()$$);

notify pgrst, 'reload schema';
