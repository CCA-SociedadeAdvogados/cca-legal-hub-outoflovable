-- Remove por completo a feature de triagem de contratos (baseada no
-- "Playbook Contratual BAE"). A tabela guardava as análises derivadas desse
-- playbook; é eliminada a pedido, juntamente com as suas políticas, índices e
-- triggers (via CASCADE).
DROP TRIGGER IF EXISTS audit_contract_triage_analyses ON public.contract_triage_analyses;
DROP TABLE IF EXISTS public.contract_triage_analyses CASCADE;
