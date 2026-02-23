import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText, Download, ChevronDown, ChevronRight, AlertTriangle, Lightbulb, Target, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// TypeScript Interfaces
interface ClauseAnalysis {
  clausula_identificada: string;
  nivel_risco: 'crítico' | 'alto' | 'médio' | 'baixo' | 'conforme';
  score_conformidade: number;
  red_flags_encontrados: string[];
  desvios_posicao_bae: string[];
  recomendacoes: string[];
  fallback_sugerido?: string;
  pontos_negociacao: string[];
}

interface AnalysisResult {
  id_analise: string;
  score_global: number;
  nivel_risco_global: string;
  clausulas_criticas: number;
  clausulas_conformes: number;
  total_clausulas_analisadas: number;
  resumo_executivo: string;
  red_flags_prioritarios: string[];
  recomendacoes_globais: string[];
  proximos_passos: string[];
  analises_clausulas: ClauseAnalysis[];
}

interface RiskBadgeProps {
  level: string;
}

interface ClauseCardProps {
  clause: ClauseAnalysis;
  isExpanded: boolean;
  onToggle: () => void;
}

// Risk Badge Component
const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const variantMap: Record<string, 'destructive' | 'secondary' | 'default' | 'outline'> = {
    'crítico': 'destructive',
    'alto': 'destructive',
    'médio': 'secondary',
    'baixo': 'outline',
    'conforme': 'default'
  };

  const colorClasses: Record<string, string> = {
    'crítico': 'bg-red-600 hover:bg-red-600',
    'alto': 'bg-orange-500 hover:bg-orange-500',
    'médio': 'bg-yellow-500 hover:bg-yellow-500 text-black',
    'baixo': 'bg-blue-500 hover:bg-blue-500',
    'conforme': 'bg-green-500 hover:bg-green-500'
  };

  return (
    <Badge 
      variant={variantMap[level] || 'secondary'}
      className={colorClasses[level] || ''}
    >
      {level?.toUpperCase()}
    </Badge>
  );
};

// Clause Card Component
const ClauseCard: React.FC<ClauseCardProps> = ({ clause, isExpanded, onToggle }) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="mb-3">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <RiskBadge level={clause.nivel_risco} />
                <span className="font-medium">{clause.clausula_identificada}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Score: {clause.score_conformidade?.toFixed(0)}%
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {clause.red_flags_encontrados?.length > 0 && (
              <div>
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Red Flags
                </h4>
                <ul className="list-disc list-inside text-sm text-destructive/90 space-y-1">
                  {clause.red_flags_encontrados.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {clause.desvios_posicao_bae?.length > 0 && (
              <div>
                <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Desvios da Posição BAE
                </h4>
                <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                  {clause.desvios_posicao_bae.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {clause.recomendacoes?.length > 0 && (
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recomendações
                </h4>
                <ul className="list-disc list-inside text-sm text-primary/90 space-y-1">
                  {clause.recomendacoes.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {clause.fallback_sugerido && (
              <div>
                <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Fall-back Sugerido
                </h4>
                <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/30 p-3 rounded">
                  {clause.fallback_sugerido.substring(0, 500)}...
                </p>
              </div>
            )}
            
            {clause.pontos_negociacao?.length > 0 && (
              <div>
                <h4 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Pontos de Negociação
                </h4>
                <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                  {clause.pontos_negociacao.slice(0, 5).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// Main Component
export default function ContractTriageAgent() {
  const { t } = useTranslation();
  const [contractText, setContractText] = useState('');
  const [contractName, setContractName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('input');

  // Analysis function
  const analyzeContract = useCallback(async () => {
    if (!contractText.trim()) {
      setError(t('contracts.triage.errorEmptyText', 'Por favor, insira o texto do contrato.'));
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract_text: contractText,
          contract_name: contractName || 'Contrato',
          save_to_db: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result.data);
      setActiveTab('results');
    } catch (err) {
      setError(`Erro ao analisar contrato: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [contractText, contractName, t]);

  // Toggle clause expansion
  const toggleClause = (index: number) => {
    setExpandedClauses(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Expand/Collapse all
  const toggleAll = (expand: boolean) => {
    if (!analysisResult?.analises_clausulas) return;
    const newState: Record<number, boolean> = {};
    analysisResult.analises_clausulas.forEach((_, i) => {
      newState[i] = expand;
    });
    setExpandedClauses(newState);
  };

  // Export results
  const exportResults = () => {
    if (!analysisResult) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise_${analysisResult.id_analise}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            {t('contracts.triage.title', 'Contract Triage Agent')}
          </CardTitle>
          <CardDescription>
            {t('contracts.triage.description', 'Análise automática de contratos baseada no Playbook Contratual BAE')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="input" className="gap-2">
                <FileText className="h-4 w-4" />
                {t('contracts.triage.inputTab', 'Inserir Contrato')}
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!analysisResult} className="gap-2">
                <Target className="h-4 w-4" />
                {t('contracts.triage.resultsTab', 'Resultados')}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Input Tab */}
            <TabsContent value="input" className="mt-0 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('contracts.triage.contractName', 'Nome do Contrato (opcional)')}
                </label>
                <Input
                  placeholder={t('contracts.triage.contractNamePlaceholder', 'Ex: Contrato SaaS com Fornecedor X')}
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('contracts.triage.contractText', 'Texto do Contrato')}
                </label>
                <Textarea
                  className="min-h-[400px] font-mono text-sm"
                  placeholder={t('contracts.triage.contractTextPlaceholder', 'Cole aqui o texto completo do contrato para análise...')}
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={analyzeContract}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('contracts.triage.analyzing', 'A analisar contrato...')}
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    {t('contracts.triage.analyze', 'Analisar Contrato')}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="mt-0 space-y-6">
              {analysisResult && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <CardContent className="pt-4">
                        <div className="text-sm opacity-80">Score Global</div>
                        <div className="text-3xl font-bold">{analysisResult.score_global?.toFixed(0)}%</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white">
                      <CardContent className="pt-4">
                        <div className="text-sm opacity-80">Nível de Risco</div>
                        <div className="text-xl font-bold uppercase">{analysisResult.nivel_risco_global}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground">
                      <CardContent className="pt-4">
                        <div className="text-sm opacity-80">Cláusulas Críticas</div>
                        <div className="text-3xl font-bold">{analysisResult.clausulas_criticas}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                      <CardContent className="pt-4">
                        <div className="text-sm opacity-80">Cláusulas Conformes</div>
                        <div className="text-3xl font-bold">{analysisResult.clausulas_conformes}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Executive Summary */}
                  <Alert className="border-primary/50 bg-primary/5">
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong className="block mb-1">{t('contracts.triage.executiveSummary', 'Resumo Executivo')}</strong>
                      {analysisResult.resumo_executivo}
                    </AlertDescription>
                  </Alert>

                  {/* Red Flags */}
                  {analysisResult.red_flags_prioritarios?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong className="block mb-2">{t('contracts.triage.priorityRedFlags', 'Red Flags Prioritários')}</strong>
                        <ul className="list-disc list-inside space-y-1">
                          {analysisResult.red_flags_prioritarios.slice(0, 5).map((rf, i) => (
                            <li key={i}>{rf}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendations */}
                  <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
                    <Lightbulb className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong className="block mb-2 text-green-800 dark:text-green-400">
                        {t('contracts.triage.recommendations', 'Recomendações')}
                      </strong>
                      <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300">
                        {analysisResult.recomendacoes_globais?.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {/* Next Steps */}
                  <Alert className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/30">
                    <Target className="h-4 w-4 text-purple-600" />
                    <AlertDescription>
                      <strong className="block mb-2 text-purple-800 dark:text-purple-400">
                        {t('contracts.triage.nextSteps', 'Próximos Passos')}
                      </strong>
                      <ol className="list-decimal list-inside space-y-1 text-purple-700 dark:text-purple-300">
                        {analysisResult.proximos_passos?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </AlertDescription>
                  </Alert>

                  {/* Clause Analysis */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">
                        {t('contracts.triage.clauseAnalysis', 'Análise por Cláusula')} ({analysisResult.total_clausulas_analisadas})
                      </h3>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAll(true)}
                        >
                          {t('contracts.triage.expandAll', 'Expandir Todas')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAll(false)}
                        >
                          {t('contracts.triage.collapseAll', 'Colapsar Todas')}
                        </Button>
                      </div>
                    </div>

                    {analysisResult.analises_clausulas?.map((clause, i) => (
                      <ClauseCard
                        key={i}
                        clause={clause}
                        isExpanded={expandedClauses[i] || false}
                        onToggle={() => toggleClause(i)}
                      />
                    ))}
                  </div>

                  {/* Export Button */}
                  <Button
                    className="w-full"
                    variant="secondary"
                    size="lg"
                    onClick={exportResults}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('contracts.triage.exportReport', 'Exportar Relatório (JSON)')}
                  </Button>
                </>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
