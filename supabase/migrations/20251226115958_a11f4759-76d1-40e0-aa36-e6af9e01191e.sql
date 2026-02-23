-- =========================
-- LEGAL MIRROR (PT) - SETUP
-- =========================

-- Create schema for legal documents
create schema if not exists legal;

-- Sources configuration table
create table if not exists legal.sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,
  name text not null,
  seeds jsonb not null default '[]'::jsonb,
  allowed_hosts jsonb not null default '[]'::jsonb,
  allowed_prefixes jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fetch queue (private)
create table if not exists legal.fetch_queue (
  url text primary key,
  source_key text not null,
  depth int not null default 0,
  priority int not null default 0,
  next_fetch_at timestamptz not null default now(),
  last_fetch_at timestamptz,
  fail_count int not null default 0,
  last_status int,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fetch_queue_due_idx
  on legal.fetch_queue (next_fetch_at, priority);

-- Documents table
create table if not exists legal.documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  canonical_url text not null,
  doc_type text not null,
  title text,
  published_at date,
  fetched_at timestamptz not null default now(),
  content_text text,
  checksum_sha256 text,
  storage_path text,
  mime_type text,
  meta jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_key, canonical_url)
);

-- Full-text search (Portuguese)
alter table legal.documents
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('portuguese', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(content_text,'')), 'B')
  ) stored;

create index if not exists documents_search_gin
  on legal.documents using gin(search_tsv);

create index if not exists documents_source_idx
  on legal.documents (source_key);

-- RLS policies
alter table legal.sources enable row level security;
alter table legal.documents enable row level security;
alter table legal.fetch_queue enable row level security;

create policy "public read sources"
  on legal.sources for select
  using (true);

create policy "public read documents"
  on legal.documents for select
  using (true);

-- Service role can insert/update/delete
create policy "service role manage sources"
  on legal.sources for all
  using (auth.role() = 'service_role');

create policy "service role manage documents"
  on legal.documents for all
  using (auth.role() = 'service_role');

create policy "service role manage fetch_queue"
  on legal.fetch_queue for all
  using (auth.role() = 'service_role');

-- Search function
create or replace function legal.search_documents(
  q text,
  p_source text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  source_key text,
  canonical_url text,
  doc_type text,
  title text,
  published_at date,
  fetched_at timestamptz,
  storage_path text,
  mime_type text
)
language sql
stable
security definer
set search_path = public, legal
as $$
  select
    d.id, d.source_key, d.canonical_url, d.doc_type, d.title, d.published_at, d.fetched_at, d.storage_path, d.mime_type
  from legal.documents d
  where
    (p_source is null or d.source_key = p_source)
    and (
      q is null or length(trim(q)) = 0
      or d.search_tsv @@ websearch_to_tsquery('portuguese', q)
      or d.canonical_url ilike ('%'||q||'%')
    )
  order by d.published_at desc nulls last, d.fetched_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function legal.search_documents(text,text,int,int) to anon, authenticated;

-- Get sources function
create or replace function legal.get_sources()
returns table (
  source_key text,
  name text,
  enabled boolean,
  document_count bigint
)
language sql
stable
security definer
set search_path = public, legal
as $$
  select 
    s.source_key,
    s.name,
    s.enabled,
    (select count(*) from legal.documents d where d.source_key = s.source_key) as document_count
  from legal.sources s
  order by s.name;
$$;

grant execute on function legal.get_sources() to anon, authenticated;

-- Get document by ID
create or replace function legal.get_document(p_id uuid)
returns table (
  id uuid,
  source_key text,
  canonical_url text,
  doc_type text,
  title text,
  published_at date,
  fetched_at timestamptz,
  content_text text,
  storage_path text,
  mime_type text,
  meta jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public, legal
as $$
  select
    d.id, d.source_key, d.canonical_url, d.doc_type, d.title, d.published_at, 
    d.fetched_at, d.content_text, d.storage_path, d.mime_type, d.meta,
    d.first_seen_at, d.last_seen_at
  from legal.documents d
  where d.id = p_id;
$$;

grant execute on function legal.get_document(uuid) to anon, authenticated;

-- Insert initial sources
insert into legal.sources (source_key, name, seeds, allowed_hosts, allowed_prefixes)
values
(
  'dre',
  'Diário da República (DRE)',
  '["https://files.diariodarepublica.pt/rss/serie1-html.xml","https://files.diariodarepublica.pt/rss/serie2-html.xml","https://diariodarepublica.pt/dr/legislacao-consolidada"]'::jsonb,
  '["diariodarepublica.pt","files.diariodarepublica.pt","data.dre.pt"]'::jsonb,
  '["/dr","/rss","/eli"]'::jsonb
),
(
  'bdp',
  'Banco de Portugal',
  '["https://www.bportugal.pt/legislacao-e-normas"]'::jsonb,
  '["www.bportugal.pt","bportugal.pt"]'::jsonb,
  '["/legislacao-e-normas","/aviso","/instrucao","/cartacircular"]'::jsonb
),
(
  'asf',
  'ASF (Seguros e Fundos de Pensões)',
  '["https://www.asf.com.pt/regulação","https://www.asf.com.pt/supervisão"]'::jsonb,
  '["www.asf.com.pt","asf.com.pt"]'::jsonb,
  '["/regulação","/supervisão","/documents/"]'::jsonb
),
(
  'cmvm',
  'CMVM (Mercado de Valores Mobiliários)',
  '["https://www.cmvm.pt/pt/Legislacao/Legislacaonacional"]'::jsonb,
  '["www.cmvm.pt","cmvm.pt"]'::jsonb,
  '["/pt/Legislacao/","/CKEditorReactive/rest/api/Download"]'::jsonb
)
on conflict (source_key) do update set
  name = excluded.name,
  seeds = excluded.seeds,
  allowed_hosts = excluded.allowed_hosts,
  allowed_prefixes = excluded.allowed_prefixes,
  enabled = true,
  updated_at = now();