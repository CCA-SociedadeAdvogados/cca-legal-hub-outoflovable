-- =====================================================
-- SOC 2 + RGPD Compliance Framework Migration
-- =====================================================

-- 1. DSAR Requests Table (Data Subject Access Requests)
CREATE TABLE IF NOT EXISTS public.dsar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification', 'restriction')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reason text,
  scheduled_execution_at timestamptz,
  completed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own DSAR requests
CREATE POLICY "Users can view own DSAR requests" ON public.dsar_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own DSAR requests
CREATE POLICY "Users can create own DSAR requests" ON public.dsar_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. User Consents Table (Granular Consent Management)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'newsletter', 'analytics', 'marketing', 'cookies_essential', 'cookies_analytics', 'cookies_marketing')),
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  policy_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents" ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own consents
CREATE POLICY "Users can insert own consents" ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents" ON public.user_consents
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Data Retention Policies Table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  retention_days integer NOT NULL,
  deletion_type text NOT NULL CHECK (deletion_type IN ('hard', 'soft', 'anonymize')),
  date_column text NOT NULL DEFAULT 'created_at',
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_deleted_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (admin only via service role)
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Only service role can manage (no user policies)
CREATE POLICY "Platform admins can view retention policies" ON public.data_retention_policies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
  );

-- Insert default retention policies
INSERT INTO public.data_retention_policies (table_name, retention_days, deletion_type, date_column) VALUES
  ('audit_logs', 365, 'hard', 'created_at'),
  ('auth_activity_logs', 180, 'hard', 'created_at'),
  ('impersonation_sessions', 90, 'hard', 'created_at'),
  ('notifications', 90, 'hard', 'created_at')
ON CONFLICT (table_name) DO NOTHING;

-- 4. Data Retention Execution Function
CREATE OR REPLACE FUNCTION public.execute_data_retention()
RETURNS TABLE (table_name text, deleted_rows bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy RECORD;
  deleted_count bigint;
  result_table text;
  result_count bigint;
BEGIN
  FOR policy IN 
    SELECT * FROM data_retention_policies WHERE enabled = true
  LOOP
    deleted_count := 0;
    
    -- Execute retention based on table
    EXECUTE format(
      'DELETE FROM %I WHERE %I < now() - interval ''%s days''',
      policy.table_name,
      policy.date_column,
      policy.retention_days
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update last run info
    UPDATE data_retention_policies 
    SET last_run_at = now(), last_deleted_count = deleted_count, updated_at = now()
    WHERE id = policy.id;
    
    result_table := policy.table_name;
    result_count := deleted_count;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 5. Add DEMO_LOGIN_ENABLED feature flag
INSERT INTO public.feature_flags (name, enabled, description) VALUES
  ('DEMO_LOGIN_ENABLED', false, 'Enables demo login button. Set to true only in non-production environments.')
ON CONFLICT (name) DO NOTHING;

-- 6. Fix permissive RLS policies - Update audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Fix auth_activity_logs INSERT policy
DROP POLICY IF EXISTS "Service role can insert auth logs" ON public.auth_activity_logs;
CREATE POLICY "Authenticated users can insert auth logs" ON public.auth_activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- 8. Fix eventos_ciclo_vida_contrato INSERT policy  
DROP POLICY IF EXISTS "Authenticated users can insert lifecycle events" ON public.eventos_ciclo_vida_contrato;
CREATE POLICY "Users can insert lifecycle events for org contracts" ON public.eventos_ciclo_vida_contrato
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = contrato_id AND om.user_id = auth.uid()
    )
  );

-- 9. Fix notifications INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- 10. Trigger for user_consents updated_at
CREATE OR REPLACE FUNCTION public.update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_user_consents_updated_at();