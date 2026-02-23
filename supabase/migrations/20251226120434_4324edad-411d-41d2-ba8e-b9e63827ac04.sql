-- RPC functions for edge functions to interact with legal schema

-- Get sources for mirror
CREATE OR REPLACE FUNCTION public.get_legal_sources_for_mirror()
RETURNS TABLE (
  source_key text,
  name text,
  seeds jsonb,
  allowed_hosts jsonb,
  allowed_prefixes jsonb,
  enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legal
AS $$
  SELECT source_key, name, seeds, allowed_hosts, allowed_prefixes, enabled
  FROM legal.sources WHERE enabled = true;
$$;

-- Get sources with counts
CREATE OR REPLACE FUNCTION public.get_legal_sources()
RETURNS TABLE (
  source_key text,
  name text,
  enabled boolean,
  document_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legal
AS $$
  SELECT s.source_key, s.name, s.enabled,
    (SELECT count(*) FROM legal.documents d WHERE d.source_key = s.source_key)
  FROM legal.sources s ORDER BY s.name;
$$;

-- Search documents
CREATE OR REPLACE FUNCTION public.search_legal_documents(
  p_query text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, source_key text, canonical_url text, doc_type text,
  title text, published_at date, fetched_at timestamptz,
  storage_path text, mime_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legal
AS $$
  SELECT d.id, d.source_key, d.canonical_url, d.doc_type, d.title,
    d.published_at, d.fetched_at, d.storage_path, d.mime_type
  FROM legal.documents d
  WHERE (p_source IS NULL OR d.source_key = p_source)
    AND (p_query IS NULL OR length(trim(p_query)) = 0
      OR d.search_tsv @@ websearch_to_tsquery('portuguese', p_query)
      OR d.canonical_url ILIKE '%' || p_query || '%')
  ORDER BY d.fetched_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Get single document
CREATE OR REPLACE FUNCTION public.get_legal_document(p_id uuid)
RETURNS TABLE (
  id uuid, source_key text, canonical_url text, doc_type text,
  title text, published_at date, fetched_at timestamptz, content_text text,
  storage_path text, mime_type text, meta jsonb, first_seen_at timestamptz, last_seen_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legal
AS $$
  SELECT d.id, d.source_key, d.canonical_url, d.doc_type, d.title,
    d.published_at, d.fetched_at, d.content_text, d.storage_path,
    d.mime_type, d.meta, d.first_seen_at, d.last_seen_at
  FROM legal.documents d WHERE d.id = p_id;
$$;

-- Upsert fetch queue
CREATE OR REPLACE FUNCTION public.upsert_legal_fetch_queue(
  p_url text, p_source_key text, p_depth int, p_priority int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legal
AS $$
BEGIN
  INSERT INTO legal.fetch_queue (url, source_key, depth, priority, next_fetch_at)
  VALUES (p_url, p_source_key, p_depth, p_priority, now())
  ON CONFLICT (url) DO NOTHING;
END;
$$;

-- Get queue items
CREATE OR REPLACE FUNCTION public.get_legal_queue_items(p_limit int DEFAULT 30)
RETURNS TABLE (url text, source_key text, depth int, priority int, fail_count int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legal
AS $$
  SELECT url, source_key, depth, priority, fail_count
  FROM legal.fetch_queue
  WHERE next_fetch_at <= now() AND fail_count < 5
  ORDER BY priority DESC, next_fetch_at ASC
  LIMIT p_limit;
$$;

-- Update queue success
CREATE OR REPLACE FUNCTION public.update_legal_queue_success(p_url text, p_status int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legal
AS $$
BEGIN
  UPDATE legal.fetch_queue SET
    last_fetch_at = now(),
    last_status = p_status,
    last_error = NULL,
    next_fetch_at = now() + interval '1 day',
    updated_at = now()
  WHERE url = p_url;
END;
$$;

-- Update queue error
CREATE OR REPLACE FUNCTION public.update_legal_queue_error(p_url text, p_error text, p_fail_count int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legal
AS $$
BEGIN
  UPDATE legal.fetch_queue SET
    last_fetch_at = now(),
    last_error = p_error,
    fail_count = p_fail_count,
    next_fetch_at = now() + (interval '1 hour' * power(2, p_fail_count)),
    updated_at = now()
  WHERE url = p_url;
END;
$$;

-- Upsert document
CREATE OR REPLACE FUNCTION public.upsert_legal_document(
  p_source_key text, p_canonical_url text, p_doc_type text,
  p_title text, p_content_text text, p_checksum_sha256 text,
  p_storage_path text, p_mime_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legal
AS $$
BEGIN
  INSERT INTO legal.documents (source_key, canonical_url, doc_type, title, content_text, checksum_sha256, storage_path, mime_type, fetched_at, last_seen_at)
  VALUES (p_source_key, p_canonical_url, p_doc_type, p_title, p_content_text, p_checksum_sha256, p_storage_path, p_mime_type, now(), now())
  ON CONFLICT (source_key, canonical_url) DO UPDATE SET
    title = COALESCE(EXCLUDED.title, legal.documents.title),
    content_text = COALESCE(EXCLUDED.content_text, legal.documents.content_text),
    checksum_sha256 = COALESCE(EXCLUDED.checksum_sha256, legal.documents.checksum_sha256),
    storage_path = COALESCE(EXCLUDED.storage_path, legal.documents.storage_path),
    mime_type = COALESCE(EXCLUDED.mime_type, legal.documents.mime_type),
    fetched_at = now(),
    last_seen_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_legal_sources() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_legal_documents(text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_legal_document(uuid) TO anon, authenticated;