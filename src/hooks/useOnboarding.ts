import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

export function useOnboarding() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const autoCompleteTriggered = useRef(false);

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Use upsert to handle case where profile might not exist
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          onboarding_completed: true,
        }, { onConflict: 'id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Auto-complete onboarding for SSO users (their data is pre-seeded)
  useEffect(() => {
    if (
      !isLoading &&
      profile &&
      profile.auth_method === 'sso_cca' &&
      !profile.onboarding_completed &&
      user?.id &&
      !autoCompleteTriggered.current
    ) {
      autoCompleteTriggered.current = true;
      console.log('[Onboarding] SSO user detected — auto-completing onboarding');
      completeOnboarding.mutate();
    }
  }, [isLoading, profile, user?.id]);

  const isSSOAutoComplete =
    profile?.auth_method === 'sso_cca' && !profile?.onboarding_completed;

  return {
    isOnboardingComplete: profile?.onboarding_completed ?? isSSOAutoComplete ?? false,
    isLoading: isLoading || isSSOAutoComplete,
    completeOnboarding,
  };
}
