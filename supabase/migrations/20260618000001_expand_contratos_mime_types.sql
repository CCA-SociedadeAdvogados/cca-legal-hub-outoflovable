-- ============================================================
-- Alargar os tipos MIME permitidos no bucket "contratos"
-- ------------------------------------------------------------
-- O componente ContractAttachments permite anexar PDF, Word, Excel
-- e imagens (PNG/JPG), mas o bucket só aceitava PDF/Word/TXT, fazendo
-- com que esses anexos falhassem com um erro de storage pouco claro.
-- Esta migração alinha os tipos aceites com os oferecidos na UI.
-- Idempotente: ON CONFLICT DO UPDATE.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos',
  'contratos',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
