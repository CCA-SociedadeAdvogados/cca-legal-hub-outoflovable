-- Add columns for storing file reference and extracted data
ALTER TABLE contratos 
ADD COLUMN IF NOT EXISTS arquivo_storage_path text,
ADD COLUMN IF NOT EXISTS arquivo_nome_original text,
ADD COLUMN IF NOT EXISTS arquivo_mime_type text,
ADD COLUMN IF NOT EXISTS extraido_json jsonb;