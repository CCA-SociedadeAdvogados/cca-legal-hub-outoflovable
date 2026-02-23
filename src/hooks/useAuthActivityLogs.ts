import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AuthActivityLog {
  id: string;
  user_id: string | null;
  auth_method: string;
  action: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAuthActivityLogs() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["auth-activity-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuthActivityLog[];
    },
    enabled: !!user,
  });

  return {
    logs,
    isLoading,
    error,
  };
}

export function useLogAuthActivity() {
  const queryClient = useQueryClient();

  const logActivity = useMutation({
    mutationFn: async ({
      userId,
      authMethod,
      action,
      success,
      metadata,
    }: {
      userId?: string;
      authMethod: "local" | "sso_cca";
      action: "login" | "logout" | "failed_login" | "password_reset" | "2fa_setup" | "2fa_verify";
      success: boolean;
      metadata?: Record<string, string | number | boolean | null>;
    }) => {
      const { error } = await supabase.from("auth_activity_logs").insert([{
        user_id: userId,
        auth_method: authMethod,
        action,
        success,
        user_agent: navigator.userAgent,
        metadata,
      }]);

      if (error) {
        console.warn("Failed to log auth activity:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-activity-logs"] });
    },
  });

  return logActivity;
}
