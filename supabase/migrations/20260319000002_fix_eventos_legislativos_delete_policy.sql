-- Fix: DELETE policy on eventos_legislativos should require admin role
-- Previously only checked organization_id without role validation

DROP POLICY IF EXISTS "Admins can delete eventos" ON public.eventos_legislativos;

CREATE POLICY "Admins can delete eventos"
  ON public.eventos_legislativos
  FOR DELETE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = eventos_legislativos.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );
