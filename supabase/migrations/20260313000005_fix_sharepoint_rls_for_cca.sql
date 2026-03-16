-- ============================================================
-- Migration: permitir que CCA interno aceda às tabelas SharePoint
--
-- As políticas RLS existentes em sharepoint_config,
-- sharepoint_documents e sharepoint_sync_logs limitam o acesso
-- ao próprio organization_id do utilizador.
-- A CCA tem de conseguir ler/gerir o SharePoint de qualquer
-- cliente enquanto actua em modo de visualização.
--
-- Fix: nova política SELECT em cada tabela usando
--      fn_is_cca_internal_authorized(auth.uid())
-- ============================================================

-- ── sharepoint_config ────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "CCA internal can view all SharePoint configs"
    ON public.sharepoint_config FOR SELECT
    USING (public.fn_is_cca_internal_authorized(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── sharepoint_documents ─────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "CCA internal can view all SharePoint documents"
    ON public.sharepoint_documents FOR SELECT
    USING (public.fn_is_cca_internal_authorized(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── sharepoint_sync_logs ─────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "CCA internal can view all SharePoint sync logs"
    ON public.sharepoint_sync_logs FOR SELECT
    USING (public.fn_is_cca_internal_authorized(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
