import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMultiContractAnalysis } from "@/hooks/useMultiContractAnalysis";
import { BrainCircuit, Send, Loader2, Trash2, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const SUGGESTED_QUESTIONS = [
  "Quais contratos expiram nos próximos 90 dias?",
  "Quais contratos têm cláusulas de renovação automática?",
  "Qual o valor total da carteira de contratos activos?",
  "Existem contratos sem DPA onde se tratam dados pessoais?",
  "Quais contratos têm cláusula de não concorrência?",
  "Quais os 3 contratos de maior valor?",
];

interface MultiContractAnalysisProps {
  organizationId: string | null;
}

export function MultiContractAnalysis({ organizationId }: MultiContractAnalysisProps) {
  const { results, isLoading, analyze, clearResults } = useMultiContractAnalysis(organizationId);
  const [question, setQuestion] = useState("");

  const handleSend = () => {
    if (!question.trim() || isLoading) return;
    analyze(question);
    setQuestion("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Análise de Portefólio IA
            <Badge variant="outline" className="text-xs font-normal">Claude Sonnet</Badge>
          </CardTitle>
          {results.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearResults}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Faça perguntas em linguagem natural sobre toda a carteira de contratos.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggested questions */}
        {results.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-muted transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {results.map((result, i) => (
              <div key={i} className="space-y-2">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground max-w-[85%]">
                    {result.question}
                  </div>
                </div>

                {/* Answer */}
                <div className="rounded-lg bg-muted px-4 py-3 text-sm max-w-[95%]">
                  <p className="whitespace-pre-wrap">{result.answer}</p>

                  {result.referenced_contracts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                        Contratos referenciados:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.referenced_contracts.map((c) => (
                          <Link
                            key={c.id}
                            to={`/contratos/${c.id}`}
                            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-muted-foreground">{c.id_interno}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{c.titulo}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {result.contracts_analyzed} contratos analisados · {format(result.timestamp, "HH:mm", { locale: pt })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 pt-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre os contratos... (Enter para enviar)"
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            disabled={isLoading || !organizationId}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!question.trim() || isLoading || !organizationId}
            className="shrink-0"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </Button>
        </div>

        {!organizationId && (
          <p className="text-xs text-muted-foreground text-center">
            Seleccione um cliente para analisar o seu portefólio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
