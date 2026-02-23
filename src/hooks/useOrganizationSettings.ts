import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface OrganizationSettings {
  id: string;
  organization_id: string;
  ai_model: string;
  ai_auto_analyze: boolean;
  ai_notify_impacts: boolean;
  ai_confidence_threshold: number;
  notification_email_alerts: boolean;
  notification_renewal_alerts: boolean;
  notification_impact_alerts: boolean;
  notification_days_before_expiry: number;
  signature_provider: string;
  signature_auto_send: boolean;
  signature_reminder_days: number;
  folder_allow_item_removal: boolean;
  created_at: string;
  updated_at: string;
}

type OrganizationSettingsUpdate = Partial<Omit<OrganizationSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;

export function useOrganizationSettings() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const organizationId = profile?.current_organization_id;

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["organization-settings", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from("organization_settings")
          .insert({
            organization_id: organizationId,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating default settings:", insertError);
          return null;
        }

        return newSettings as OrganizationSettings;
      }

      return data as OrganizationSettings;
    },
    enabled: !!organizationId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: OrganizationSettingsUpdate) => {
      if (!organizationId || !settings?.id) {
        throw new Error("No organization or settings found");
      }

      const { data, error } = await supabase
        .from("organization_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings", organizationId] });
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast.error("Erro ao guardar definições");
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
