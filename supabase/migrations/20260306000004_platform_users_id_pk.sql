-- Registo histórico: coluna id em platform_users e correcção para SERIAL PK
--
-- A coluna id (integer, sem default) foi adicionada directamente no Supabase
-- Dashboard. Sem sequence/default, INSERTs sem id explícito falham.
-- Esta migration converte para SERIAL (auto-incremento) e garante PK.

-- Converter id para SERIAL (cria sequence e liga como default)
DO $$
BEGIN
  -- Só actua se id ainda não tiver default (evitar recriar sequence)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'platform_users'
      AND column_name  = 'id'
      AND column_default IS NOT NULL
  ) THEN
    -- Criar sequence e associar ao id
    CREATE SEQUENCE IF NOT EXISTS public.platform_users_id_seq;
    -- Definir valor inicial acima do máximo actual para evitar colisões
    PERFORM setval(
      'public.platform_users_id_seq',
      COALESCE((SELECT MAX(id) FROM public.platform_users), 0) + 1
    );
    ALTER TABLE public.platform_users
      ALTER COLUMN id SET DEFAULT nextval('public.platform_users_id_seq');
    ALTER SEQUENCE public.platform_users_id_seq OWNED BY public.platform_users.id;
  END IF;

  -- Adicionar PK apenas se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.platform_users'::regclass
      AND contype   = 'p'
  ) THEN
    ALTER TABLE public.platform_users ADD PRIMARY KEY (id);
  END IF;
END
$$;

COMMENT ON COLUMN public.platform_users.id IS
  'PK integer SERIAL. Adicionado via Dashboard; esta migration converte '
  'para auto-incremento e garante constraint PRIMARY KEY. '
  'O email continua a ser o identificador natural para lookups SSO.';
