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
      const { error } = await supabase
        .from("organizations")
        .update({ jvris_id: jvrisId.trim() || null } as any)
        .eq("id", organizationId);
      if (error) throw error;
      setCurrentSavedId(jvrisId.trim() || null);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-financial-info"] });
      toast.success("ID Jvris guardado com sucesso");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.error(msg ? `Erro ao guardar ID Jvris: ${msg}` : "Erro ao guardar ID Jvris");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">A carregar configuração Jvris...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2 flex-wrap">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base font-medium">ID Jvris</Label>
        {currentSavedId ? (
          <Badge variant="outline" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Configurado
          </Badge>
        ) : (
          <Badge variant="subtle" className="text-xs">
            Não configurado
          </Badge>
        )}
      </div>

      {currentSavedId && (
        <p className="text-xs text-muted-foreground font-mono truncate">
          {currentSavedId}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="jvris-id">ID Jvris</Label>
        <Input
          id="jvris-id"
          value={jvrisId}
          onChange={(e) => setJvrisId(e.target.value)}
          placeholder="ex: CCA-001"
        />
        <p className="text-xs text-muted-foreground">
          Identificador único no sistema Jvris para ligar os dados Base Nav.
        </p>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !organizationId}
        className="w-full"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            A guardar...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Guardar ID Jvris
          </>
        )}
      </Button>
    </div>
  );
}
