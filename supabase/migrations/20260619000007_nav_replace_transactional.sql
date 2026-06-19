-- Escrita transacional da sincronização NAV.
-- Faz upsert do cache + substituição dos itens (delete+insert) numa ÚNICA
-- transação. Evita a janela em que os itens podiam ficar vazios se a corrida
-- falhasse a meio. Chamada pela edge function sync-nav-excel (service role).
CREATE OR REPLACE FUNCTION public.fn_replace_nav_data(p_cache jsonb, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Upsert do cache (por cliente)
  INSERT INTO public.financeiro_nav_cache (jvris_id, valor_pendente, data_vencimento, raw_row, synced_at)
  SELECT c.jvris_id, c.valor_pendente, c.data_vencimento, COALESCE(c.raw_row, '{}'::jsonb), COALESCE(c.synced_at, now())
  FROM jsonb_to_recordset(p_cache) AS c(
    jvris_id text, valor_pendente numeric, data_vencimento date, raw_row jsonb, synced_at timestamptz
  )
  ON CONFLICT (jvris_id) DO UPDATE SET
    valor_pendente  = EXCLUDED.valor_pendente,
    data_vencimento = EXCLUDED.data_vencimento,
    raw_row         = EXCLUDED.raw_row,
    synced_at       = EXCLUDED.synced_at;

  -- 2. Substituir os itens dos clientes sincronizados (delete + insert atómicos)
  DELETE FROM public.financeiro_nav_items
  WHERE jvris_id IN (SELECT c.jvris_id FROM jsonb_to_recordset(p_cache) AS c(jvris_id text));

  INSERT INTO public.financeiro_nav_items (jvris_id, numero_documento, descricao, valor, data_vencimento, raw_row, synced_at)
  SELECT i.jvris_id, i.numero_documento, i.descricao, i.valor, i.data_vencimento, COALESCE(i.raw_row, '{}'::jsonb), COALESCE(i.synced_at, now())
  FROM jsonb_to_recordset(p_items) AS i(
    jvris_id text, numero_documento text, descricao text, valor numeric, data_vencimento date, raw_row jsonb, synced_at timestamptz
  );
END;
$$;

-- Apenas a service role (edge function) pode executar; não exposto via API pública.
REVOKE ALL ON FUNCTION public.fn_replace_nav_data(jsonb, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_replace_nav_data(jsonb, jsonb) TO service_role;
