import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  const updateFlag = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled })
        .eq("name", name);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flag actualizada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao actualizar feature flag: " + error.message);
    },
  });

  const isEnabled = (flagName: string): boolean => {
    const flag = flags.find((f) => f.name === flagName);
    return flag?.enabled ?? false;
  };

  return {
    flags,
    isLoading,
    error,
    isEnabled,
    updateFlag,
    // Convenience methods for specific flags
    isSSOEnabled: isEnabled("ENABLE_SSO_CCA"),
    is2FAEnabled: isEnabled("ENABLE_2FA"),
    isDocTranslationDisabled: isEnabled("DISABLE_AI_TRANSLATION_FOR_DOCUMENTS"),
  };
}

// Hook para verificar uma flag específica (mais eficiente para componentes que só precisam de uma flag)
export function useFeatureFlag(flagName: string) {
  const { data: enabled = false, isLoading } = useQuery({
    queryKey: ["feature-flag", flagName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("name", flagName)
        .maybeSingle();

      if (error) {
        console.warn(`Feature flag "${flagName}" error:`, error.message);
        return false;
      }
      return data?.enabled ?? false;
    },
  });

  return { enabled, isLoading };
}
