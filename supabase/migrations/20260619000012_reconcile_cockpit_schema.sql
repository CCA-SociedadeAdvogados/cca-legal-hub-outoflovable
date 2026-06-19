-- ============================================================
-- Reconciliação de schema do cockpit — restaura colunas que a produção perdeu
-- (drift manual) mas que a aplicação usa, eliminando consultas/escritas partidas.
-- Idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- 1. contratos.nivel_risco — nível de risco do contrato (badge no Financeiro).
--    Texto livre controlado pela app (baixo | medio | alto | critico).
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS nivel_risco text;

-- 2. organizations: ficha financeira do cliente.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tipo_cliente text,
  ADD COLUMN IF NOT EXISTS prazo_pagamento_dias integer;

-- 3. Colunas de auditoria escritas pelo cockpit (regra: updated_by_id obrigatório
--    em updates). A produção tinha-as perdido nestas tabelas.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS updated_by_id uuid;

ALTER TABLE public.impactos
  ADD COLUMN IF NOT EXISTS updated_by_id uuid;

NOTIFY pgrst, 'reload schema';
