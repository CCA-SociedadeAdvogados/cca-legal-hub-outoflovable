import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserConsent {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  policy_version: string | null;
  created_at: string;
  updated_at: string;
}

interface DSARRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  reason: string | null;
  scheduled_execution_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const CONSENT_TYPES = [
  { id: "terms", labelKey: "privacy.consents.terms", required: true },
  { id: "privacy", labelKey: "privacy.consents.privacy", required: true },
  { id: "newsletter", labelKey: "privacy.consents.newsletter", required: false },
  { id: "analytics", labelKey: "privacy.consents.analytics", required: false },
  { id: "marketing", labelKey: "privacy.consents.marketing", required: false },
] as const;

export function useUserConsents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: consents = [], isLoading, error } = useQuery({
    queryKey: ["user-consents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_consents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserConsent[];
    },
    enabled: !!user?.id,
  });

  const updateConsent = useMutation({
    mutationFn: async ({ 
      consentType, 
      granted, 
      policyVersion 
    }: { 
      consentType: string; 
      granted: boolean; 
      policyVersion?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const now = new Date().toISOString();
      const consentData = {
        user_id: user.id,
        consent_type: consentType,
        granted,
        granted_at: granted ? now : null,
        revoked_at: granted ? null : now,
        policy_version: policyVersion || "1.0",
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("user_consents")
        .upsert(consentData, { onConflict: "user_id,consent_type" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-consents"] });
    },
    onError: (error) => {
      console.error("Failed to update consent:", error);
      toast.error("Erro ao atualizar consentimento");
    },
  });

  const getConsentStatus = (consentType: string): boolean => {
    const consent = consents.find(c => c.consent_type === consentType);
    return consent?.granted ?? false;
  };

  return {
    consents,
    isLoading,
    error,
    updateConsent,
    getConsentStatus,
  };
}

export function useDSARRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["dsar-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("dsar_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DSARRequest[];
    },
    enabled: !!user?.id,
  });

  const hasPendingDeletion = requests.some(
    r => r.request_type === "deletion" && r.status === "pending"
  );

  const pendingDeletionRequest = requests.find(
    r => r.request_type === "deletion" && r.status === "pending"
  );

  const requestDataExport = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("user-data-export", {
        method: "POST",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Create a download link for the JSON data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      queryClient.invalidateQueries({ queryKey: ["dsar-requests"] });
      toast.success("Dados exportados com sucesso!");
    },
    onError: (error) => {
      console.error("Failed to export data:", error);
      toast.error("Erro ao exportar dados. Tente novamente.");
    },
  });

  const requestAccountDeletion = useMutation({
    mutationFn: async ({ password, reason }: { password: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("user-data-deletion", {
        method: "POST",
        body: { action: "request", password, reason },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dsar-requests"] });
      toast.success(data.message || "Pedido de eliminação registado.");
    },
    onError: (error: Error) => {
      console.error("Failed to request deletion:", error);
      toast.error(error.message || "Erro ao solicitar eliminação.");
    },
  });

  const cancelDeletionRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("user-data-deletion", {
        method: "POST",
        body: { action: "cancel", request_id: requestId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dsar-requests"] });
      toast.success("Pedido de eliminação cancelado.");
    },
    onError: (error: Error) => {
      console.error("Failed to cancel deletion:", error);
      toast.error(error.message || "Erro ao cancelar pedido.");
    },
  });

  return {
    requests,
    isLoading,
    error,
    hasPendingDeletion,
    pendingDeletionRequest,
    requestDataExport,
    requestAccountDeletion,
    cancelDeletionRequest,
  };
}
