-- Registo histórico: coluna id (PK) em platform_users
--
-- A coluna id foi adicionada directamente no Supabase Dashboard
-- para resolver o erro "column id does not exist" que impedia o
-- login SSO de ultrapassar o onboarding.
-- Esta migration regista a alteração para manter o histórico de schema
-- no repositório e permitir reproduzir o ambiente (staging, local dev).
--
-- A coluna email continua a ser usada como identificador natural
-- (lookup por email na edge function sso-cca), mas id é necessário
-- como PK standard para que RLS e outras queries funcionem correctamente.

ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Garantir que id é NOT NULL (necessário para PK)
DO $$
BEGIN
  -- Preencher id em registos existentes sem id
  UPDATE public.platform_users SET id = gen_random_uuid() WHERE id IS NULL;

  -- Adicionar constraint PRIMARY KEY apenas se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.platform_users'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.platform_users ADD PRIMARY KEY (id);
  END IF;
END
$$;

COMMENT ON COLUMN public.platform_users.id IS
  'PK UUID gerado automaticamente. '
  'Adicionado para corrigir "column id does not exist" no login SSO. '
  'O email continua a ser o identificador natural para lookups.';
