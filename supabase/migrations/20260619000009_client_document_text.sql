-- Texto extraído dos documentos do cliente (pastas SharePoint), para o
-- assistente do portal poder pesquisar e citar o conteúdo (RAG via full-text
-- search do Postgres — sem embeddings/fornecedor externo).
CREATE TABLE IF NOT EXISTS public.client_document_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sharepoint_document_id uuid REFERENCES public.sharepoint_documents(id) ON DELETE CASCADE,
  name text NOT NULL,
  folder_path text,
  web_url text,
  content text NOT NULL DEFAULT '',
  -- tsvector em português, gerado a partir do conteúdo (para FTS)
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content, ''))) STORED,
  char_count integer NOT NULL DEFAULT 0,
  source_modified_at timestamptz,
  extracted_at timestamptz NOT NULL DEFAULT now()
);

-- Um registo por documento SharePoint
CREATE UNIQUE INDEX IF NOT EXISTS client_document_text_doc_unique
  ON public.client_document_text (sharepoint_document_id)
  WHERE sharepoint_document_id IS NOT NULL;

-- Índice FTS + filtro por organização
CREATE INDEX IF NOT EXISTS client_document_text_tsv_gin
  ON public.client_document_text USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS client_document_text_org
  ON public.client_document_text (organization_id);

-- Acesso só via service role (edge functions). RLS ativa sem políticas.
ALTER TABLE public.client_document_text ENABLE ROW LEVEL SECURITY;
