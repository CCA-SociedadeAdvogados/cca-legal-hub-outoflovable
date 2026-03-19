-- Notification preferences per user
-- Allows users to configure alert thresholds and notification types

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Expiration alerts: custom days before expiry (default 30,60,90)
  expiry_alert_days INTEGER[] DEFAULT '{30,60,90}',

  -- Enable/disable by type
  enable_contract_expiry BOOLEAN DEFAULT true,
  enable_financial_due BOOLEAN DEFAULT true,
  enable_legislative_events BOOLEAN DEFAULT true,
  enable_cca_news BOOLEAN DEFAULT true,
  enable_document_checklist BOOLEAN DEFAULT true,

  -- Channel preferences (for future email integration)
  channel_in_app BOOLEAN DEFAULT true,
  channel_email BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_own" ON notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
