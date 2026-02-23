import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  FileSearch,
  Scale,
  ClipboardList,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useContractComplianceAnalysis } from '@/hooks/useContractComplianceAnalysis';
import { useProfile } from '@/hooks/useProfile';

interface ContractComplianceAnalyzerProps {
  contratoId?: string;
  tipoContrato?: string;
  areasDireitoAplicaveis?: string[];
  initialTextContent?: string;
  onAnalysisComplete?: (data: any) => void;
}

interface ComplianceResult {
  resumo_contrato: string;
  eventos_verificados: {
    evento_id: string;
    evento_titulo: string;
    area_direito: string;
    status_conformidade: 'conforme' | 'parcialmente_conforme' | 'nao_conforme' | 'nao_aplicavel';
    gaps_identificados: string[];
    recomendacoes: string[];
    clausulas_relevantes: string[];
    prioridade: 'alta' | 'media' | 'baixa';
  }[];
  sumario_geral: {
    total_eventos: number;
    conformes: number;
    parcialmente_conformes: number;
    nao_conformes: number;
    nao_aplicaveis: number;
  };
  recomendacoes_gerais: string[];
  proximos_passos: string[];
  confianca: number;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; badge: string }> = {
  conforme: { 
    icon: CheckCircle2, 
    color: 'text-green-500', 
    bg: 'bg-green-500/10', 
    label: 'Conforme',
    badge: 'bg-green-100 text-green-800'
  },
  parcialmente_conforme: { 
    icon: AlertTriangle, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10', 
    label: 'Parcialmente Conforme',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  nao_conforme: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bg: 'bg-red-500/10', 
    label: 'Não Conforme',
    badge: 'bg-red-100 text-red-800'
  },
  nao_aplicavel: { 
    icon: FileText, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted', 
    label: 'Não Aplicável',
    badge: 'bg-gray-100 text-gray-800'
  },
};

const defaultStatus = statusConfig.nao_aplicavel;

const prioridadeConfig: Record<string, { color: string; bg: string }> = {
  alta: { color: 'text-red-500', bg: 'bg-red-100 text-red-800' },
  media: { color: 'text-yellow-500', bg: 'bg-yellow-100 text-yellow-800' },
  baixa: { color: 'text-blue-500', bg: 'bg-blue-100 text-blue-800' },
};

const defaultPrioridade = prioridadeConfig.media;

export function ContractComplianceAnalyzer({ 
  contratoId, 
  tipoContrato,
  areasDireitoAplicaveis,
  initialTextContent = '',
  onAnalysisComplete 
}: ContractComplianceAnalyzerProps) {
  const { settings } = useOrganizationSettings();
  const { profile } = useProfile();
  const { saveAnalysis, isSaving } = useContractComplianceAnalysis(contratoId);
  const [textContent, setTextContent] = useState(initialTextContent);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ComplianceResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update textContent when initialTextContent changes
  React.useEffect(() => {
    if (initialTextContent && !textContent) {
      setTextContent(initialTextContent);
    }
  }, [initialTextContent]);

  const isValidFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
    const isWord = file.type?.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx');
    return isPdf || isTxt || isWord;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFile(file)) {
      toast.error('Formato não suportado. Use ficheiros PDF, Word ou TXT.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O ficheiro é demasiado grande. Máximo 10MB.');
      return;
    }

    // For text files, read directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setTextContent(text);
      toast.success('Ficheiro carregado com sucesso');
      return;
    }

    // For PDF and Word files, send to edge function for text extraction
    setIsAnalyzing(true);
    setAnalysisStep('A extrair texto do documento...');

    try {
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-contract', {
        body: { 
          fileContent: base64Content, 
          fileName: file.name, 
          mimeType: file.type 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.extractedText) {
        setTextContent(data.extractedText);
        toast.success('Texto extraído com sucesso');
      } else {
        toast.error('Não foi possível extrair texto do documento');
      }
    } catch (err: any) {
      console.error('Error extracting text:', err);
      toast.error(err.message || 'Erro ao extrair texto do documento');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
      // Reset file input to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const analyzeCompliance = async () => {
    if (!textContent.trim()) {
      toast.error('Por favor, insira o texto do contrato para análise');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('A iniciar análise...');

    try {
      setAnalysisStep('A verificar conformidade com legislação...');

      const { data, error } = await supabase.functions.invoke('analyze-compliance', {
        body: {
          type: 'contract_compliance_check',
          data: {
            textContent,
            tipoContrato: tipoContrato || 'outro',
            contratoId,
            areasDireitoAplicaveis: areasDireitoAplicaveis || [],
          },
          model: settings?.ai_model,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.data as ComplianceResult;
      setAnalysisResult(result);
      onAnalysisComplete?.(result);

      // Save to database if contratoId and organizationId are available
      if (contratoId && profile?.current_organization_id) {
        try {
          await saveAnalysis({
            result,
            organizationId: profile.current_organization_id,
            aiModel: settings?.ai_model,
          });
        } catch (saveError) {
          console.error('Error saving analysis:', saveError);
          // Don't fail the whole operation if save fails
        }
      }

      toast.success('Análise de conformidade concluída e guardada');
    } catch (error: any) {
      console.error('Error analyzing compliance:', error);
      toast.error(error.message || 'Erro ao analisar conformidade');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const getOverallStatus = () => {
    if (!analysisResult) return null;
    const { sumario_geral } = analysisResult;
    
    if (sumario_geral.nao_conformes > 0) return 'nao_conforme';
    if (sumario_geral.parcialmente_conformes > 0) return 'parcialmente_conforme';
    return 'conforme';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload e Análise de Conformidade IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              <FileSearch className="mr-2 h-4 w-4" />
              Carregar Ficheiro
            </Button>
            <span className="text-sm text-muted-foreground">
              ou cole o texto do contrato abaixo
            </span>
          </div>

          <Textarea
            placeholder="Cole aqui o texto completo do contrato para análise de conformidade...&#10;&#10;A IA irá verificar automaticamente a conformidade com os eventos legislativos das áreas classificadas."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            disabled={isAnalyzing}
          />

          {areasDireitoAplicaveis && areasDireitoAplicaveis.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Áreas a verificar:</span>
              <div className="flex flex-wrap gap-1">
                {areasDireitoAplicaveis.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}




          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {textContent.length} caracteres
            </p>
            <Button
              type="button"
              onClick={analyzeCompliance}
              disabled={isAnalyzing || !textContent.trim()}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {analysisStep}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar Conformidade
                </>
              )}
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={33} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                A verificar conformidade com eventos legislativos...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysisResult && (
        <>
          {/* Overall Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Resumo da Análise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{analysisResult.sumario_geral.total_eventos}</p>
                  <p className="text-sm text-muted-foreground">Total Verificados</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{analysisResult.sumario_geral.conformes}</p>
                  <p className="text-sm text-muted-foreground">Conformes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                  <p className="text-2xl font-bold text-yellow-600">{analysisResult.sumario_geral.parcialmente_conformes}</p>
                  <p className="text-sm text-muted-foreground">Parcialmente</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10">
                  <p className="text-2xl font-bold text-red-600">{analysisResult.sumario_geral.nao_conformes}</p>
                  <p className="text-sm text-muted-foreground">Não Conformes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-muted-foreground">{analysisResult.sumario_geral.nao_aplicaveis}</p>
                  <p className="text-sm text-muted-foreground">N/A</p>
                </div>
              </div>

              {/* Overall Status Alert */}
              {getOverallStatus() && (
                <Alert className={`mt-4 ${statusConfig[getOverallStatus()!].bg}`}>
                  {(() => {
                    const status = getOverallStatus()!;
                    const StatusIcon = statusConfig[status].icon;
                    return (
                      <>
                        <StatusIcon className={`h-4 w-4 ${statusConfig[status].color}`} />
                        <AlertTitle>{statusConfig[status].label}</AlertTitle>
                        <AlertDescription>{analysisResult.resumo_contrato}</AlertDescription>
                      </>
                    );
                  })()}
                </Alert>
              )}

              {/* Confidence */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confiança da análise:</span>
                <Progress value={analysisResult.confianca} className="h-2 w-24" />
                <span className="text-sm font-medium">{analysisResult.confianca}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Análise Detalhada por Legislação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {analysisResult.eventos_verificados.map((evento, index) => {
                    const config = statusConfig[evento.status_conformidade] || defaultStatus;
                    const StatusIcon = config.icon;
                    const prioridade = prioridadeConfig[evento.prioridade] || defaultPrioridade;

                    return (
                      <Card key={index} className={`${config.bg} border-l-4`} style={{ borderLeftColor: config.color.replace('text-', '') }}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-5 w-5 ${config.color}`} />
                              <div>
                                <h4 className="font-semibold">{evento.evento_titulo}</h4>
                                <p className="text-sm text-muted-foreground">{evento.area_direito}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={config.badge}>{config.label}</Badge>
                              {evento.status_conformidade !== 'nao_aplicavel' && (
                                <Badge className={prioridade.bg}>Prioridade {evento.prioridade}</Badge>
                              )}
                            </div>
                          </div>

                          {evento.gaps_identificados.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-600 mb-1">Gaps Identificados:</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {evento.gaps_identificados.map((gap, i) => (
                                  <li key={i} className="text-muted-foreground">{gap}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {evento.recomendacoes.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-blue-600 mb-1">Recomendações:</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {evento.recomendacoes.map((rec, i) => (
                                  <li key={i} className="text-muted-foreground">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {evento.clausulas_relevantes.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Cláusulas Relevantes:</p>
                              <div className="flex flex-wrap gap-1">
                                {evento.clausulas_relevantes.map((clausula, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{clausula}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* General Recommendations */}
          {(analysisResult.recomendacoes_gerais.length > 0 || analysisResult.proximos_passos.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Recomendações e Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.recomendacoes_gerais.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recomendações Gerais:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.recomendacoes_gerais.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.proximos_passos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Próximos Passos:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {analysisResult.proximos_passos.map((passo, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{passo}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}