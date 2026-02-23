-- Adicionar trigger de auditoria para a tabela contract_triage_analyses
CREATE TRIGGER audit_contract_triage_analyses
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_triage_analyses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Comentário para documentação
COMMENT ON TRIGGER audit_contract_triage_analyses ON public.contract_triage_analyses IS 'Trilha de auditoria para análises de triagem de contratos';