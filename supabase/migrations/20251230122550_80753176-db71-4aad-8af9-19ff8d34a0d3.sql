-- Create organization settings table for persisting AI and other settings
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL DEFAULT 'gpt-5-2025-08-07',
  ai_auto_analyze BOOLEAN NOT NULL DEFAULT true,
  ai_notify_impacts BOOLEAN NOT NULL DEFAULT true,
  ai_confidence_threshold INTEGER NOT NULL DEFAULT 70,
  notification_email_alerts BOOLEAN NOT NULL DEFAULT true,
  notification_renewal_alerts BOOLEAN NOT NULL DEFAULT true,
  notification_impact_alerts BOOLEAN NOT NULL DEFAULT true,
  notification_days_before_expiry INTEGER NOT NULL DEFAULT 30,
  signature_provider TEXT NOT NULL DEFAULT 'manual',
  signature_auto_send BOOLEAN NOT NULL DEFAULT false,
  signature_reminder_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for organization settings access
CREATE POLICY "Users can view their organization settings"
ON public.organization_settings
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and owners can update organization settings"
ON public.organization_settings
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can insert organization settings"
ON public.organization_settings
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();