-- Fix: eventos_ciclo_vida_contrato has USING (true) policy allowing cross-org access
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view lifecycle events" ON public.eventos_ciclo_vida_contrato;

-- The existing "Users can view lifecycle events in their organization" policy 
-- properly restricts access via contratos join