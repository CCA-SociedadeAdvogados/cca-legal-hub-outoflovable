-- Disable only the audit trigger for bulk update
ALTER TABLE public.documentos_gerados DISABLE TRIGGER audit_documentos_gerados;

-- Update existing documents that belong to accounting module
UPDATE public.documentos_gerados 
SET modulo = 'CONTABILIDADE' 
WHERE contrato_id IS NULL 
  AND tipo = 'outro' 
  AND modulo = 'ASSINATURA';

-- Re-enable the audit trigger
ALTER TABLE public.documentos_gerados ENABLE TRIGGER audit_documentos_gerados;