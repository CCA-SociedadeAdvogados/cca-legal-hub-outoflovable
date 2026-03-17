-- Allow users to insert their own user_departments entries
--
-- Problem: the DepartmentGate calls syncDepartamento which inserts into
-- user_departments. The existing policy only allows owner/admin, but any
-- authenticated member should be able to self-assign to a department that
-- already exists in their org (e.g. on first login via DepartmentGate).

CREATE POLICY "Users can insert their own user_departments"
  ON public.user_departments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_belongs_to_organization(auth.uid(), organization_id)
  );
