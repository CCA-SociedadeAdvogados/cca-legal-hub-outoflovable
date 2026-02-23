import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, CheckCircle, Loader2, Save } from "lucide-react";

interface OrgLegalBiConfigProps {
  organizationId: string | null;
}

export function OrgLegalBiConfig({ organizationId }: OrgLegalBiConfigProps) {
  const queryClient = useQueryClient();
  const [legalbiUrl, setLegalbiUrl] = useState("");
  const [currentSavedUrl, setCurrentSavedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setLegalbiUrl("");
      setCurrentSavedUrl(null);
      return;
    }

    setIsLoading(true);
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("legalbi_url")
        .eq("id", organizationId)
        .single();
      const url = (data as any)?.legalbi_url as string | null | undefined;
      setCurrentSavedUrl(url ?? null);
      setLegalbiUrl(url ?? "");
      setIsLoading(false);
    })();
  }, [organizationId]);

  const handleSave = async () => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ legalbi_url: legalbiUrl || null } as any)
        .eq("id", organizationId);
      if (error) throw error;
      setCurrentSavedUrl(legalbiUrl || null);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["current-organization"] });
      toast.success("URL do LegalBi guardado com sucesso");
    } catch {
      toast.error("Erro ao guardar URL do LegalBi");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">A carregar configuração LegalBi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base font-medium">Configuração LegalBi</Label>
        {currentSavedUrl ? (
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

      {currentSavedUrl && (
        <p className="text-xs text-muted-foreground font-mono truncate">
          {currentSavedUrl}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="legalbi-url">URL do LegalBi</Label>
        <Input
          id="legalbi-url"
          type="url"
          value={legalbiUrl}
          onChange={(e) => setLegalbiUrl(e.target.value)}
          placeholder="https://app.legalbi.com/..."
        />
        <p className="text-xs text-muted-foreground">
          URL do dashboard LegalBi desta organização. Visível para todos os utilizadores na barra lateral.
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
            Guardar Configuração LegalBi
          </>
        )}
      </Button>
    </div>
  );
}
