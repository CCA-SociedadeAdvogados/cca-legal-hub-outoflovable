-- Pesquisa full-text nos documentos do cliente, devolvendo excertos destacados.
-- Usada pelo portal-assistant (service role) para fundamentar respostas no
-- conteúdo dos documentos das pastas do cliente.
CREATE OR REPLACE FUNCTION public.fn_search_client_documents(
  p_org uuid,
  p_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE(name text, folder_path text, web_url text, excerpt text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    d.name,
    d.folder_path,
    d.web_url,
    ts_headline(
      'portuguese', d.content, q,
      'MaxFragments=2, MinWords=8, MaxWords=32, ShortWord=2, FragmentDelimiter=" … "'
    ) AS excerpt
  FROM public.client_document_text d,
       websearch_to_tsquery('portuguese', p_query) q
  WHERE d.organization_id = p_org
    AND d.content_tsv @@ q
  ORDER BY ts_rank(d.content_tsv, q) DESC
  LIMIT greatest(1, least(coalesce(p_limit, 5), 10));
$$;

-- Apenas a service role (edge function) pode executar; não exposta via API.
REVOKE ALL ON FUNCTION public.fn_search_client_documents(uuid, text, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_search_client_documents(uuid, text, int) TO service_role;
