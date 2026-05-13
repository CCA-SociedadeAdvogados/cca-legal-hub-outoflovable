import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface NotificationPrefs {
  id: string;
  user_id: string;
  expiry_alert_days: number[];
  enable_contract_expiry: boolean;
  enable_financial_due: boolean;
  enable_legislative_events: boolean;
  enable_cca_news: boolean;
  enable_document_checklist: boolean;
  channel_in_app: boolean;
  channel_email: boolean;
}

const DEFAULT_PREFS: Omit<NotificationPrefs, 'id' | 'user_id'> = {
  expiry_alert_days: [30, 60, 90],
  enable_contract_expiry: true,
  enable_financial_due: true,
  enable_legislative_events: true,
  enable_cca_news: true,
  enable_document_checklist: true,
  channel_in_app: true,
  channel_email: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id, user],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('notification_preferences' as never)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // Table might not exist yet
        console.warn('[NotificationPrefs] Table not available:', error.message);
        return { ...DEFAULT_PREFS, id: '', user_id: user.id } as NotificationPrefs;
      }

      if (!data) {
        return { ...DEFAULT_PREFS, id: '', user_id: user.id } as NotificationPrefs;
      }

      return data as unknown as NotificationPrefs;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const updatePrefs = useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPrefs, 'id' | 'user_id'>>) => {
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('notification_preferences' as never)
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
      toast({ title: 'Preferências de notificação guardadas' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao guardar preferências',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    prefs: prefs ?? ({ ...DEFAULT_PREFS, id: '', user_id: user?.id ?? '' } as NotificationPrefs),
    isLoading,
    updatePrefs,
    isTableAvailable: !!prefs && prefs.id !== '',
  };
}
