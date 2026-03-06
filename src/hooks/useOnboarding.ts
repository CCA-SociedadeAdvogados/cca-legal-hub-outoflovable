import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

const MAX_AUTO_COMPLETE_RETRIES = 3;
const AUTO_COMPLETE_TIMEOUT_MS = 10_000;

export function useOnboarding() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const autoCompleteTriggered = useRef(false);
  const retryCount = useRef(0);
  const [ssoAutoCompleteGaveUp, setSsoAutoCompleteGaveUp] = useState(false);

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
      !autoCompleteTriggered.current &&
      !ssoAutoCompleteGaveUp
    ) {
      if (retryCount.current >= MAX_AUTO_COMPLETE_RETRIES) {
        console.warn('[Onboarding] SSO auto-complete exceeded max retries — giving up');
        setSsoAutoCompleteGaveUp(true);
        return;
      }

      autoCompleteTriggered.current = true;
      retryCount.current += 1;
      console.log(`[Onboarding] SSO user detected — auto-completing onboarding (attempt ${retryCount.current})`);

      completeOnboarding.mutate(undefined, {
        onError: (err) => {
          console.error('[Onboarding] SSO auto-complete failed:', err);
          // Allow useEffect to retry on next render cycle
          autoCompleteTriggered.current = false;
        },
      });
    }
  }, [isLoading, profile, user?.id, ssoAutoCompleteGaveUp]);

  // Timeout fallback: if auto-complete hasn't resolved within 10s, stop blocking
  useEffect(() => {
    if (
      profile?.auth_method === 'sso_cca' &&
      !profile?.onboarding_completed &&
      !ssoAutoCompleteGaveUp
    ) {
      const timer = setTimeout(() => {
        if (!profile?.onboarding_completed) {
          console.warn('[Onboarding] SSO auto-complete timed out — unblocking UI');
          setSsoAutoCompleteGaveUp(true);
        }
      }, AUTO_COMPLETE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [profile?.auth_method, profile?.onboarding_completed, ssoAutoCompleteGaveUp]);

  const isSSOAutoComplete =
    profile?.auth_method === 'sso_cca' &&
    !profile?.onboarding_completed &&
    !ssoAutoCompleteGaveUp;

  return {
    isOnboardingComplete: profile?.onboarding_completed ?? isSSOAutoComplete ?? false,
    isLoading: isLoading || isSSOAutoComplete,
    completeOnboarding,
  };
}
