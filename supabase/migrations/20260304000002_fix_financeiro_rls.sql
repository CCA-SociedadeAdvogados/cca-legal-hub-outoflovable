-- Fix RLS policies on financeiro tables
-- The previous policies used auth.role() = 'authenticated' which is unreliable
-- in newer Supabase/PostgREST versions (can return 'anon' even with valid JWT).
-- Also adds missing GRANT SELECT to the authenticated role.

-- 1. Grant table-level SELECT to authenticated role
GRANT SELECT ON public.financeiro_nav_items TO authenticated;
GRANT SELECT ON public.financeiro_nav_cache TO authenticated;

-- 2. Drop broken policies that use auth.role()
DROP POLICY IF EXISTS "Authenticated users can read nav items" ON public.financeiro_nav_items;
DROP POLICY IF EXISTS "Authenticated users can read nav cache" ON public.financeiro_nav_cache;

-- 3. Recreate with correct pattern: TO authenticated + USING (true)
CREATE POLICY "Authenticated users can read nav items"
    ON public.financeiro_nav_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read nav cache"
    ON public.financeiro_nav_cache FOR SELECT TO authenticated USING (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
