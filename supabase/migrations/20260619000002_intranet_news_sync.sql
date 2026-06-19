-- Sincronização Intranet → Portal: Notícias do SharePoint via Microsoft Graph.
-- As notícias publicadas no site dedicado da intranet são espelhadas em cca_news
-- e ficam imediatamente visíveis no Portal do Cliente (estado='publicado').

-- 1. Marcar a origem das notícias e permitir idempotência por página da intranet
ALTER TABLE public.cca_news
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'intranet')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text;

-- Uma linha por página da intranet (permite upsert idempotente sem duplicar)
CREATE UNIQUE INDEX IF NOT EXISTS cca_news_external_id_unique
  ON public.cca_news (external_id)
  WHERE source = 'intranet';

-- 2. Estado da subscrição de notificações do Microsoft Graph
CREATE TABLE IF NOT EXISTS public.intranet_news_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id text NOT NULL,
  resource text NOT NULL,
  expiration_at timestamptz NOT NULL,
  client_state text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Acesso apenas via service role (Edge Functions). RLS ativa sem políticas
-- → anon/authenticated não conseguem ler nem escrever.
ALTER TABLE public.intranet_news_subscription ENABLE ROW LEVEL SECURITY;
