-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notifications when news is published
CREATE OR REPLACE FUNCTION public.notify_on_news_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications when status changes to 'publicado'
  IF NEW.estado = 'publicado' AND (OLD IS NULL OR OLD.estado IS DISTINCT FROM 'publicado') THEN
    -- Insert notification for all users (global news) or org members
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id)
    SELECT 
      p.id,
      om.organization_id,
      'news_published',
      NEW.titulo,
      COALESCE(NEW.resumo, LEFT(NEW.conteudo, 150) || '...'),
      'cca_news',
      NEW.id
    FROM public.profiles p
    LEFT JOIN public.organization_members om ON om.user_id = p.id
    WHERE NEW.organization_id IS NULL 
       OR om.organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for news publication
CREATE TRIGGER trigger_news_published
  AFTER INSERT OR UPDATE ON public.cca_news
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_news_published();