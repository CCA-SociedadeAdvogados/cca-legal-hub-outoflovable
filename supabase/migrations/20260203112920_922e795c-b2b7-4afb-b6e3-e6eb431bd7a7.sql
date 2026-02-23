-- Add module field to distinguish document origin/purpose (column only, no data update)
ALTER TABLE public.documentos_gerados 
ADD COLUMN IF NOT EXISTS modulo text NOT NULL DEFAULT 'ASSINATURA';

-- Add comment for clarity
COMMENT ON COLUMN public.documentos_gerados.modulo IS 'Origin module: ASSINATURA for signature workflow, CONTABILIDADE for accounting/archive documents';