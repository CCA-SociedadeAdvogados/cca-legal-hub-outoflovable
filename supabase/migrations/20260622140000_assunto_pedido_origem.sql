-- ============================================================
-- Liga Pedidos à CCA → Assuntos
--
-- Um pedido (inbound do cliente) pode ser "promovido" a assunto quando exige
-- trabalho continuado. O assunto guarda a origem (pedido_origem_id) para ligar
-- os dois e evitar registos duplicados para o mesmo trabalho.
-- ============================================================

ALTER TABLE public.assuntos
  ADD COLUMN IF NOT EXISTS pedido_origem_id uuid
    REFERENCES public.on_demand_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS assuntos_pedido_origem_idx
  ON public.assuntos (pedido_origem_id);

COMMENT ON COLUMN public.assuntos.pedido_origem_id IS
  'Pedido à CCA que originou este assunto, quando promovido a partir de Pedidos.';
