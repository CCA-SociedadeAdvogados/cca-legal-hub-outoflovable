-- A unique index parcial (WHERE sharepoint_document_id IS NOT NULL) não pode
-- servir de árbitro para ON CONFLICT (sharepoint_document_id), pelo que os
-- upserts de index-client-documents falhavam (42P10) e o texto dos documentos
-- nunca chegava a client_document_text. Substituir por um unique index
-- não-parcial (em Postgres os NULL continuam distintos, e na prática a coluna
-- está sempre preenchida).
DROP INDEX IF EXISTS public.client_document_text_doc_unique;

CREATE UNIQUE INDEX IF NOT EXISTS client_document_text_doc_unique
  ON public.client_document_text (sharepoint_document_id);

NOTIFY pgrst, 'reload schema';
