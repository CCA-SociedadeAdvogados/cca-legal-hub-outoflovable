-- Update trigger to include translation metadata for news notifications
CREATE OR REPLACE FUNCTION public.notify_on_news_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications when status changes to 'publicado'
  IF NEW.estado = 'publicado' AND (OLD IS NULL OR OLD.estado IS DISTINCT FROM 'publicado') THEN
    -- Insert notification for all users (global news) or org members
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, metadata)
    SELECT 
      p.id,
      om.organization_id,
      'news_published',
      'notifications.newsPublishedTitle',
      COALESCE(NEW.resumo, LEFT(NEW.conteudo, 150) || '...'),
      'cca_news',
      NEW.id,
      jsonb_build_object(
        'title_key', 'notifications.newsPublishedTitle',
        'title_params', jsonb_build_object('newsTitle', NEW.titulo),
        'original_title', NEW.titulo
      )
    FROM public.profiles p
    LEFT JOIN public.organization_members om ON om.user_id = p.id
    WHERE NEW.organization_id IS NULL 
       OR om.organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;