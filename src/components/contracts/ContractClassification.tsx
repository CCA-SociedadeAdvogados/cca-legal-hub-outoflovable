import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tags, Save, AlertTriangle } from "lucide-react";

interface ContractClassificationProps {
  contratoId: string;
  currentAreas: string[];
  tipoContrato: string;
  onClassificationChange?: (areas: string[]) => void;
}

const AREAS_DIREITO = [
  { value: "laboral", label: "Laboral", description: "Código do Trabalho, contratos de trabalho, relações laborais" },
  { value: "fiscal", label: "Fiscal", description: "Impostos, tributação, obrigações fiscais" },
  { value: "comercial", label: "Comercial", description: "Código Comercial, transações comerciais" },
  { value: "protecao_dados", label: "Proteção de Dados", description: "RGPD, privacidade, tratamento de dados pessoais" },
  { value: "ambiente", label: "Ambiente", description: "Legislação ambiental, sustentabilidade" },
  { value: "seguranca_trabalho", label: "Segurança no Trabalho", description: "SST, saúde ocupacional" },
  { value: "societario", label: "Societário", description: "Direito das sociedades, governança corporativa" },
  { value: "ciberseguranca", label: "Cibersegurança", description: "NIS2, segurança informática, infraestruturas críticas" },
  { value: "outro", label: "Outro", description: "Outras áreas de direito aplicáveis" },
];

// Sugestões automáticas baseadas no tipo de contrato
const SUGESTOES_POR_TIPO: Record<string, string[]> = {
  trabalho: ["laboral", "protecao_dados", "seguranca_trabalho"],
  saas: ["protecao_dados", "ciberseguranca", "comercial"],
  prestacao_servicos: ["comercial", "protecao_dados", "fiscal"],
  fornecimento: ["comercial", "fiscal"],
  nda: ["protecao_dados", "comercial"],
  arrendamento: ["comercial", "fiscal"],
  licenciamento: ["comercial", "protecao_dados"],
  parceria: ["comercial", "societario"],
  consultoria: ["comercial", "protecao_dados", "fiscal"],
  outro: ["comercial"],
};

export function ContractClassification({
  contratoId,
  currentAreas,
  tipoContrato,
  onClassificationChange,
}: ContractClassificationProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(currentAreas || []);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSelectedAreas(currentAreas || []);
  }, [currentAreas]);

  useEffect(() => {
    const areasChanged = JSON.stringify(selectedAreas.sort()) !== JSON.stringify((currentAreas || []).sort());
    setHasChanges(areasChanged);
  }, [selectedAreas, currentAreas]);

  const handleAreaToggle = (area: string) => {
    setSelectedAreas((prev) => {
      if (prev.includes(area)) {
        return prev.filter((a) => a !== area);
      } else {
        return [...prev, area];
      }
    });
  };

  const applySuggestions = () => {
    const sugestoes = SUGESTOES_POR_TIPO[tipoContrato] || SUGESTOES_POR_TIPO.outro;
    setSelectedAreas(sugestoes);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("contratos")
        .update({ areas_direito_aplicaveis: selectedAreas })
        .eq("id", contratoId);

      if (error) throw error;

      toast.success("Classificação guardada com sucesso");
      onClassificationChange?.(selectedAreas);
    } catch (error: any) {
      console.error("Error saving classification:", error);
      toast.error(error.message || "Erro ao guardar classificação");
    } finally {
      setIsSaving(false);
    }
  };

  const sugestoes = SUGESTOES_POR_TIPO[tipoContrato] || SUGESTOES_POR_TIPO.outro;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Classificação Jurídica
        </CardTitle>
        <CardDescription>
          Selecione as áreas de direito aplicáveis a este contrato. Esta classificação determina 
          quais eventos legislativos serão utilizados na análise de conformidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sugestões automáticas */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Sugestão automática</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Com base no tipo de contrato ({tipoContrato}), sugerimos as seguintes áreas:
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {sugestoes.map((area) => {
              const areaInfo = AREAS_DIREITO.find((a) => a.value === area);
              return (
                <Badge key={area} variant="secondary">
                  {areaInfo?.label || area}
                </Badge>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applySuggestions}>
            Aplicar sugestões
          </Button>
        </div>

        {/* Seleção de áreas */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Áreas de Direito Aplicáveis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AREAS_DIREITO.map((area) => (
              <div
                key={area.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  selectedAreas.includes(area.value)
                    ? "bg-primary/5 border-primary/30"
                    : "bg-background hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  id={`area-${area.value}`}
                  checked={selectedAreas.includes(area.value)}
                  onCheckedChange={() => handleAreaToggle(area.value)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`area-${area.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {area.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{area.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Áreas selecionadas */}
        {selectedAreas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Áreas Selecionadas ({selectedAreas.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedAreas.map((area) => {
                const areaInfo = AREAS_DIREITO.find((a) => a.value === area);
                return (
                  <Badge key={area} variant="default">
                    {areaInfo?.label || area}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Botão de guardar */}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "A guardar..." : "Guardar Classificação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
