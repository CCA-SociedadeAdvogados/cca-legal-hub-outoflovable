import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useProfile } from './useProfile';

type ThemePreference = 'light' | 'dark' | 'system';

export const useUserTheme = () => {
  const { profile, updateProfile } = useProfile();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Sync theme from profile to next-themes on load/change
  useEffect(() => {
    if (profile?.theme_preference) {
      const preference = profile.theme_preference as ThemePreference;
      if (preference !== theme) {
        setTheme(preference);
      }
    }
  }, [profile?.theme_preference, setTheme, theme]);

  const toggleTheme = useCallback(async () => {
    const newTheme: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
    
    // Apply immediately for instant feedback
    setTheme(newTheme);
    
    // Persist to database (silently, no toast for theme changes)
    if (profile) {
      await updateProfile.mutateAsync(
        { theme_preference: newTheme },
        {
          onSuccess: () => {
            // Silently succeed - no toast needed for theme toggle
          },
          onError: () => {
            // Revert on error
            setTheme(resolvedTheme || 'system');
          },
        }
      );
    }
  }, [resolvedTheme, setTheme, profile, updateProfile]);

  const setUserTheme = useCallback(async (newTheme: ThemePreference) => {
    setTheme(newTheme);
    
    if (profile) {
      await updateProfile.mutateAsync(
        { theme_preference: newTheme },
        {
          onSuccess: () => {},
          onError: () => {
            setTheme(resolvedTheme || 'system');
          },
        }
      );
    }
  }, [setTheme, profile, updateProfile, resolvedTheme]);

  return {
    theme: theme as ThemePreference | undefined,
    resolvedTheme: resolvedTheme as 'light' | 'dark' | undefined,
    toggleTheme,
    setUserTheme,
    isUpdating: updateProfile.isPending,
  };
};
