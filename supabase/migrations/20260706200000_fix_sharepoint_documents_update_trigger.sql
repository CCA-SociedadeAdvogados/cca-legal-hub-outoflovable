-- ============================================================
-- sharepoint_documents — remover trigger de updated_at inválido
--
-- A tabela não tem coluna updated_at, mas tinha um trigger BEFORE UPDATE a
-- executar update_updated_at_column(), que atribui NEW.updated_at. Qualquer
-- UPDATE à tabela falhava com «record "new" has no field "updated_at"» —
-- afectando a sincronização e as operações de mover/limpar documentos.
-- O campo de frescura desta tabela é synced_at, gerido explicitamente.
-- ============================================================

DROP TRIGGER IF EXISTS update_sharepoint_documents_updated_at ON public.sharepoint_documents;
