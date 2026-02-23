-- Update status constraint to include 'expired' status
ALTER TABLE public.impersonation_sessions 
DROP CONSTRAINT IF EXISTS impersonation_sessions_status_check;

ALTER TABLE public.impersonation_sessions 
ADD CONSTRAINT impersonation_sessions_status_check 
CHECK (status IN ('active', 'ended', 'expired'));

-- Create function to automatically expire stale sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION public.expire_stale_impersonation_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.impersonation_sessions
  SET 
    status = 'expired',
    ended_at = now()
  WHERE status = 'active'
    AND started_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- Grant execute permission to authenticated users (platform admins)
GRANT EXECUTE ON FUNCTION public.expire_stale_impersonation_sessions() TO authenticated;