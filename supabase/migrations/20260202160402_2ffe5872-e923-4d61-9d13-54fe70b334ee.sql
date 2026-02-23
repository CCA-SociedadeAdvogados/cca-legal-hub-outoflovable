-- Add folder_allow_item_removal setting to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN folder_allow_item_removal BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can delete folder items" ON public.folder_items;

-- New policy: Only allows deletion if:
-- 1. Platform admin OR
-- 2. Admin/Owner of org AND organization allows removal
CREATE POLICY "Admins can delete folder items"
  ON public.folder_items FOR DELETE
  USING (
    is_platform_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1
        FROM client_folders cf
        JOIN organization_members om ON om.organization_id = cf.organization_id
        LEFT JOIN organization_settings os ON os.organization_id = cf.organization_id
        WHERE cf.id = folder_items.folder_id 
          AND om.user_id = auth.uid() 
          AND om.role IN ('owner', 'admin')
          AND COALESCE(os.folder_allow_item_removal, FALSE) = TRUE
      )
    )
  );