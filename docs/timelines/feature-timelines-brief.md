# Feature: Timelines de processos — brief de implementação

> Documento para o **Claude Code** executar contra o repo do Legal Hub.
> Stack assumido: React 18 + TypeScript (Vercel), Supabase (PostgreSQL + RLS, West EU), Azure AD SSO. Papéis existentes: `app_admin`, `cca_manager`, `cca_user`, `org_manager`, `org_user`.
> **Se algum pressuposto não bater com o repo (nomes de tabelas de perfis, coluna de org, etc.), adapta em vez de assumir.**

## 1. Objetivo e regras de negócio

- O **advogado** (`cca_user`/`cca_manager`) escolhe um template de timeline para um caso e **ativa/conclui fases através de toggles**.
- O **cliente** (`org_user`/`org_manager`) **vê a timeline** do seu caso — apenas as fases ativadas/concluídas — **e nunca vê prazos nem datas**.
- Os `.md` validados em `docs/timelines/` (ex.: `timeline-civel-cpc.md`, `timeline-cautelar.md`, …) são a **fonte de verdade do conteúdo**; a base de dados é populada a partir deles.

## 2. Princípio de segurança (não negociável)

O "nunca com prazos" é garantido **na camada de dados**, não na UI:

- As colunas de prazo/datas internas vivem só em tabelas/funções a que o papel de cliente **não tem acesso direto**.
- O único caminho de dados do cliente é a função `tl_client_timeline`, que **por construção não seleciona nenhuma coluna de prazo/data**.
- Toda a mutação (toggles) passa por funções `SECURITY DEFINER` que verificam o papel.

## 3. Modelo de dados (SQL)

```sql
-- Helpers de identidade (ajustar ao nome real da tabela de perfis)
create or replace function public.tl_role() returns text
  language sql stable as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.tl_org() returns uuid
  language sql stable as $$ select org_id from public.profiles where id = auth.uid() $$;
create or replace function public.tl_is_lawyer() returns boolean
  language sql stable as $$ select public.tl_role() in ('cca_user','cca_manager','app_admin') $$;

-- Templates (conteúdo dos .md)
create table public.tl_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,          -- ex.: 'civel-cpc'
  title text not null,
  area text, jurisdicao text, base_legal text, versao text,
  created_at timestamptz default now()
);

-- Fases do template (INTERNO: prazo_dias, contagem, anchor)
create table public.tl_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tl_templates(id) on delete cascade,
  ordem int not null,
  label text not null,               -- seguro para cliente
  tipo text not null check (tipo in ('gatilho','prazo_parte','prazo_tribunal','marco')),
  base_legal text,                   -- interno
  prazo_dias int,                    -- interno
  contagem text,                     -- interno: 'cpc_suspende' | 'cpc_urgente' | 'sem_dilacao' | 'civil'
  anchor text,                       -- interno: id/ordem da fase âncora
  is_optional boolean default false,
  confirmar boolean default false,   -- flag ⚠️ de validação
  notas text                         -- interno
);

-- Instância = um caso concreto (INTERNO: gatilho_data, dilacao, urgente)
create table public.tl_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tl_templates(id),
  matter_ref text,
  org_id uuid not null,              -- cliente dono do caso
  gatilho_data date,                 -- interno
  dilacao_dias int default 0,        -- interno
  urgente boolean default false,     -- interno
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- Estado por fase da instância (o toggle vive aqui)
create table public.tl_instance_phases (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.tl_instances(id) on delete cascade,
  phase_id uuid not null references public.tl_phases(id),
  estado text not null default 'pendente' check (estado in ('pendente','ativa','concluida')),
  data_conclusao date,               -- interno
  prazo_calculado date,              -- interno (calculado)
  notas_internas text,               -- interno
  unique (instance_id, phase_id)
);
```

## 4. RLS e funções (a camada que garante o "nunca com prazos")

```sql
alter table public.tl_templates        enable row level security;
alter table public.tl_phases           enable row level security;
alter table public.tl_instances        enable row level security;
alter table public.tl_instance_phases  enable row level security;

-- Advogados: acesso total via RLS. Clientes: SEM políticas de SELECT direto (só via RPC).
create policy tl_tpl_lawyer on public.tl_templates
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_phs_lawyer on public.tl_phases
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_inst_lawyer on public.tl_instances
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_iphs_lawyer on public.tl_instance_phases
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());

-- VISTA DO CLIENTE: sem prazo, sem datas. Só fases ativadas/concluídas do seu próprio caso.
create or replace function public.tl_client_timeline(p_instance uuid)
returns table (ordem int, label text, tipo text, estado text)
language sql security definer set search_path = public as $$
  select p.ordem, p.label, p.tipo, ip.estado
  from public.tl_instance_phases ip
  join public.tl_phases p    on p.id = ip.phase_id
  join public.tl_instances i on i.id = ip.instance_id
  where ip.instance_id = p_instance
    and i.org_id = public.tl_org()             -- cliente só vê o seu org
    and ip.estado in ('ativa','concluida')     -- só o que o advogado ligou
  order by p.ordem;
$$;
revoke all on function public.tl_client_timeline(uuid) from public;
grant execute on function public.tl_client_timeline(uuid) to authenticated;

-- VISTA DO ADVOGADO: tudo, incluindo prazo_calculado, base_legal e notas.
create or replace function public.tl_lawyer_timeline(p_instance uuid)
returns table (
  instance_phase_id uuid, ordem int, label text, tipo text,
  base_legal text, estado text, prazo_calculado date,
  data_conclusao date, is_optional boolean, confirmar boolean, notas text
)
language sql security definer set search_path = public as $$
  select ip.id, p.ordem, p.label, p.tipo, p.base_legal, ip.estado,
         ip.prazo_calculado, ip.data_conclusao, p.is_optional, p.confirmar, p.notas
  from public.tl_instance_phases ip
  join public.tl_phases p on p.id = ip.phase_id
  where ip.instance_id = p_instance and public.tl_is_lawyer()
  order by p.ordem;
$$;
revoke all on function public.tl_lawyer_timeline(uuid) from public;
grant execute on function public.tl_lawyer_timeline(uuid) to authenticated;

-- TOGGLE: só advogado. Ativar/concluir/repor uma fase.
create or replace function public.tl_set_phase(p_instance_phase uuid, p_estado text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tl_is_lawyer() then raise exception 'not authorized'; end if;
  if p_estado not in ('pendente','ativa','concluida') then raise exception 'estado invalido'; end if;
  update public.tl_instance_phases
     set estado = p_estado,
         data_conclusao = case when p_estado = 'concluida' then current_date else null end
   where id = p_instance_phase;
end; $$;
revoke all on function public.tl_set_phase(uuid, text) from public;
grant execute on function public.tl_set_phase(uuid, text) to authenticated;
```

> **Teste de aceitação de segurança:** autenticado como `org_user`, tentar `select * from tl_instance_phases` e `tl_lawyer_timeline(...)` deve devolver **0 linhas / erro**; só `tl_client_timeline(...)` devolve dados, e nunca colunas de prazo/data.

## 5. Motor de contagem (interno, opcional nesta fase)

O cálculo de `prazo_calculado` segue a "regra de cálculo" descrita em cada `.md` (dies a quo não conta; suspensão em férias judiciais salvo urgente ou prazo ≥ 6 meses; termo em dia não útil transfere; Páscoa móvel). Implementar como função `tl_calc_prazo(anchor date, dias int, urgente bool, suspende bool)` em PL/pgSQL **ou** em TypeScript no lado do servidor. Como é interno (só advogado), pode entrar numa segunda iteração — marcar `prazo_calculado` como nullable até lá. Referência do algoritmo: secção "Regra de cálculo" dos ficheiros `docs/timelines/*.md`.

## 6. Frontend (React/TS)

**`LawyerTimeline.tsx`** (papéis cca)
- `const { data } = await supabase.rpc('tl_lawyer_timeline', { p_instance })`.
- Renderiza cada fase com um **toggle/stepper**: pendente → ativa → concluída.
- Mostra `prazo_calculado`, `base_legal`, badge ⚠️ quando `confirmar`, e `notas`.
- On change: `await supabase.rpc('tl_set_phase', { p_instance_phase, p_estado })`, depois refetch.

**`ClientTimeline.tsx`** (papéis org)
- `const { data } = await supabase.rpc('tl_client_timeline', { p_instance })`.
- Renderiza um **stepper read-only** só com `label` + `estado` (ativa/concluída). **Sem datas, sem prazos, sem base legal.**
- Guardar contra render de qualquer campo de data — o RPC nem os devolve.

## 7. Seed a partir dos `.md`

1. Commitar os ficheiros `docs/timelines/*.md`.
2. Script (`scripts/seed_timelines.ts`) que faz o parse do *frontmatter* e das tabelas de fases de cada `.md` e faz upsert em `tl_templates` + `tl_phases` (mapear colunas: label, tipo, base_legal, prazo→prazo_dias, contagem, ordem, ⚠️→confirmar).
3. Executar contra a base Supabase (service role).

## 8. Checklist para o Claude Code

- [ ] Migração SQL com as 4 tabelas + RLS + as 3 funções.
- [ ] Teste de aceitação de segurança da secção 4.
- [ ] `scripts/seed_timelines.ts` a ler `docs/timelines/*.md`.
- [ ] `LawyerTimeline.tsx` (toggles) e `ClientTimeline.tsx` (read-only sem prazos).
- [ ] Ligar as vistas às rotas/páginas conforme o papel do utilizador.
- [ ] (2.ª iteração) `tl_calc_prazo` + preenchimento de `prazo_calculado`.
