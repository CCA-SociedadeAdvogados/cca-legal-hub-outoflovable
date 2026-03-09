import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Hash, CheckCircle, Loader2, Save } from "lucide-react";

interface OrgJvrisIdConfigProps {
  organizationId: string | null;
}

export function OrgJvrisIdConfig({ organizationId }: OrgJvrisIdConfigProps) {
  const queryClient = useQueryClient();
  const [jvrisId, setJvrisId] = useState("");
  const [currentSavedId, setCurrentSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setJvrisId("");
      setCurrentSavedId(null);
      return;
    }

    setIsLoading(true);
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("jvris_id")
        .eq("id", organizationId)
        .single();
      const id = (data as any)?.jvris_id as string | null | undefined;
      setCurrentSavedId(id ?? null);
      setJvrisId(id ?? "");
      setIsLoading(false);
    })();
  }, [organizationId]);

  const handleSave = async () => {
  if (!organizationId) return;

  setIsSaving(true);

  try {
    const normalizedId = jvrisId.trim() || null;

    const { error } = await supabase
      .from("organizations")
      .update({ jvris_id: normalizedId } as any)
      .eq("id", organizationId);

    if (error) throw error;

    const { data: spConfig } = await supabase
      .from("sharepoint_config")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!spConfig) {
      throw new Error(
        "SharePoint não configurado para esta organização. Configure a integração SharePoint primeiro em Definições."
      );
    }

    const { data, error: syncError } = await supabase.functions.invoke("sync-nav-excel", {
      body: { organization_id: organizationId },
    });

    if (syncError) {
      let msg = syncError.message;

      try {
        const ctx = (syncError as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) {
            msg =
              typeof body.error === "string"
                ? body.error
                : body.error?.message || JSON.stringify(body.error);
          }
        }
      } catch {
        // mantém mensagem base
      }

      throw new Error(msg);
    }

    setCurrentSavedId(normalizedId);

    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    queryClient.invalidateQueries({ queryKey: ["organization-financial-info"] });
    queryClient.invalidateQueries({ queryKey: ["financeiro-nav-cache"] });
    queryClient.invalidateQueries({ queryKey: ["financeiro-nav-items"] });
    queryClient.invalidateQueries({ queryKey: ["available-jvris-ids"] });

    toast.success(
      `ID Jvris guardado e Base Nav sincronizada com sucesso (${data?.items ?? 0} faturas)`
    );
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message;
    toast.error(msg ? `Erro ao guardar ID Jvris: ${msg}` : "Erro ao guardar ID Jvris");
  } finally {
    setIsSaving(false);
  }
};
