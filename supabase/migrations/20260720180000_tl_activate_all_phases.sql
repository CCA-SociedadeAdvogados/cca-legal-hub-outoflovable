-- Ativar todas as fases de uma instância de uma só vez (só advogado).
--
-- Semântica: apenas fases 'pendente' passam a 'ativa' — fases já
-- 'concluida' não são tocadas (ativar tudo não deve regredir conclusões).
-- Mesmo padrão de segurança de tl_set_phase: SECURITY DEFINER + tl_is_lawyer.
-- Devolve o número de fases ativadas.

create or replace function public.tl_activate_all_phases(p_instance uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.tl_is_lawyer() then
    raise exception 'not authorized';
  end if;
  update public.tl_instance_phases
     set estado = 'ativa'
   where instance_id = p_instance
     and estado = 'pendente';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.tl_activate_all_phases(uuid) from public;
grant execute on function public.tl_activate_all_phases(uuid) to authenticated;

notify pgrst, 'reload schema';
