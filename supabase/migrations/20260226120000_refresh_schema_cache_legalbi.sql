-- Garante que a coluna existe (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'legalbi_url'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN legalbi_url text DEFAULT NULL;
  END IF;
END $$;

-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
