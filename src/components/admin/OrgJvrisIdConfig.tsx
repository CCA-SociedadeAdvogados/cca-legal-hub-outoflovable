import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
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
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("jvris_id")
          .eq("id", organizationId)
          .maybeSingle();

        if (error) throw error;

        const id = data?.jvris_id ?? null;
        setCurrentSavedId(id);
        setJvrisId(id ?? "");
      } catch (err) {
        console.error("[OrgJvrisIdConfig] erro ao carregar jvris_id:", err);
        toast.error("Erro ao carregar ID Jvris da organização");
        setCurrentSavedId(null);
        setJvrisId("");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [organizationId]);

  const handleSave = async () => {
    if (!organizationId) return;

    setIsSaving(true);

    try {
      const normalizedId = jvrisId.trim() || null;

      const payload: TablesUpdate<"organizations"> = {
        jvris_id: normalizedId,
      };

      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", organizationId);

      if (error) throw error;

      const { data: spConfig, error: spConfigError } = await supabase
        .from("sharepoint_config")
        .select("id")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (spConfigError) throw spConfigError;

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
          const ctx = (syncError as { context?: { json?: () => Promise<unknown> } }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            const errorBody = body as { error?: string | { message?: string } };
            if (errorBody?.error) {
              msg =
                typeof errorBody.error === "string"
                  ? errorBody.error
                  : errorBody.error?.message || JSON.stringify(errorBody.error);
            }
          }
        } catch {
          // Mantém a mensagem original
        }

        throw new Error(msg);
      }

      setCurrentSavedId(normalizedId);
      setJvrisId(normalizedId ?? "");

      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-financial-info", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-nav-cache"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-nav-items"] });
      queryClient.invalidateQueries({ queryKey: ["available-jvris-ids", organizationId] });

      toast.success(
        `ID Jvris guardado e Base NAV sincronizada com sucesso (${data?.items ?? 0} faturas)`
      );
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.error(msg ? `Erro ao guardar ID Jvris: ${msg}` : "Erro ao guardar ID Jvris");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (jvrisId.trim() || null) !== currentSavedId;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          <h3 className="text-sm font-medium">Configuração de ID Jvris</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Defina o ID Jvris da organização para permitir a associação e sincronização da Base NAV.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="org-jvris-id">ID Jvris da organização</Label>
        <Input
          id="org-jvris-id"
          value={jvrisId}
          onChange={(e) => setJvrisId(e.target.value)}
          placeholder="Introduza o ID Jvris"
          disabled={!organizationId || isLoading || isSaving}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={currentSavedId ? "default" : "secondary"}>
          {currentSavedId ? `Actual: ${currentSavedId}` : "Sem ID Jvris configurado"}
        </Badge>

        {currentSavedId && (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Guardado
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={!organizationId || isLoading || isSaving || !hasChanges}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar e sincronizar NAV
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
