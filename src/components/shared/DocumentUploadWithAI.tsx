import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentAnalysisResult {
  // Campos normalizados (sempre usados para exibição)
  resumo: string;
  pontos_principais: string[];
  areas_afetadas?: string[];
  recomendacoes: string[];
  riscos_identificados?: string[];
  confianca: number;
  dados_extraidos?: Record<string, any>;
}

// Normaliza o resultado da IA para campos consistentes (PT)
const normalizeAnalysisResult = (result: any): DocumentAnalysisResult => ({
  resumo: result.resumo || result.summary || '',
  pontos_principais: result.pontos_principais || result.key_points || [],
  areas_afetadas: result.areas_afetadas || result.affected_areas || [],
  recomendacoes: result.recomendacoes || result.recommendations || [],
  riscos_identificados: result.riscos_identificados || result.identified_risks || [],
  confianca: result.confianca ?? result.confidence ?? 0,
  dados_extraidos: result.dados_extraidos || result.extracted_data || {},
});

export type DocumentContext = 
  | 'evento_legislativo' 
  | 'impacto' 
  | 'politica' 
  | 'template' 
  | 'documento';

interface DocumentUploadWithAIProps {
  context: DocumentContext;
  onAnalysisComplete?: (result: DocumentAnalysisResult, file: File, extractedText: string) => void;
  onFileUploaded?: (file: File, url: string) => void;
  title?: string;
  description?: string;
  showInDialog?: boolean;
  compact?: boolean;
}

export function DocumentUploadWithAI({
  context,
  onAnalysisComplete,
  onFileUploaded,
  title,
  description,
  showInDialog = false,
  compact = false,
}: DocumentUploadWithAIProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);

  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const isValidFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
    const isWord = file.type?.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx');
    return isPdf || isTxt || isWord;
  };

  const readFileAsText = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getContextPromptType = () => {
    switch (context) {
      case 'evento_legislativo':
        return 'analyze_legislative_document';
      case 'impacto':
        return 'analyze_impact_document';
      case 'politica':
        return 'analyze_policy_document';
      case 'template':
        return 'analyze_template_document';
      case 'documento':
        return 'analyze_general_document';
      default:
        return 'analyze_general_document';
    }
  };

  const processFile = async (file: File) => {
    if (!isValidFile(file)) {
      setError(t('upload.invalidFormat'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('upload.fileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const isTextFile = file.type === 'text/plain' || file.name.endsWith('.txt');
      const content = await readFileAsText(file);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-document', {
        body: {
          type: getContextPromptType(),
          language: i18n.language, // 'pt' ou 'en'
          data: isTextFile 
            ? { textContent: content, context }
            : { fileContent: content, fileName: file.name, mimeType: file.type, context }
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.data) {
        const normalizedResult = normalizeAnalysisResult(data.data);
        setAnalysisResult(normalizedResult);
        toast.success(t('upload.analysisComplete'));
        onAnalysisComplete?.(normalizedResult, file, data.extractedText || '');
      } else {
        throw new Error(t('upload.invalidResponse'));
      }
    } catch (err: any) {
      console.error('Error processing file:', err);
      setError(err.message || t('upload.processingError'));
      toast.error(err.message || t('upload.processingError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && !isProcessing) {
      processFile(file);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const contextLabels: Record<DocumentContext, { title: string; description: string }> = {
    evento_legislativo: {
      title: t('upload.legislativeDocTitle'),
      description: t('upload.legislativeDocDescription'),
    },
    impacto: {
      title: t('upload.impactDocTitle'),
      description: t('upload.impactDocDescription'),
    },
    politica: {
      title: t('upload.policyDocTitle'),
      description: t('upload.policyDocDescription'),
    },
    template: {
      title: t('upload.templateDocTitle'),
      description: t('upload.templateDocDescription'),
    },
    documento: {
      title: t('upload.generalDocTitle'),
      description: t('upload.generalDocDescription'),
    },
  };

  const displayTitle = title || contextLabels[context].title;
  const displayDescription = description || contextLabels[context].description;

  if (compact) {
    return (
      <div className="space-y-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />

        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : error
                ? 'border-destructive/50 hover:border-destructive'
                : 'hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-sm">{t('upload.processing')}</span>
            </div>
          ) : selectedFile && !error ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearSelection(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('upload.dragOrClickCompact')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {analysisResult && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {t('upload.analysisResult')}
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                analysisResult.confianca >= 80 ? 'bg-green-100 text-green-700' :
                analysisResult.confianca >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {analysisResult.confianca}% {t('upload.confidence')}
              </span>
            </div>
            
            <p className="text-sm text-foreground font-medium">{analysisResult.resumo}</p>
            
            {analysisResult.pontos_principais && analysisResult.pontos_principais.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('upload.mainPoints')}:</p>
                <ul className="text-sm space-y-1">
                  {analysisResult.pontos_principais.map((ponto, i) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                      <span>{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysisResult.recomendacoes && analysisResult.recomendacoes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('upload.recommendations')}:</p>
                <ul className="text-sm space-y-1">
                  {analysisResult.recomendacoes.map((rec, i) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysisResult.riscos_identificados && analysisResult.riscos_identificados.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('upload.risksIdentified')}:</p>
                <ul className="text-sm space-y-1">
                  {analysisResult.riscos_identificados.map((risco, i) => (
                    <li key={i} className="text-orange-600 flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      <span>{risco}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysisResult.dados_extraidos && Object.keys(analysisResult.dados_extraidos).length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('upload.extractedData')}:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(analysisResult.dados_extraidos).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="ml-1 text-foreground font-medium">
                        {Array.isArray(value) ? value.slice(0, 2).join(', ') : String(value).slice(0, 50)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{displayTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">{displayDescription}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />

        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02]' 
              : error
                ? 'border-destructive/50 hover:border-destructive'
                : 'hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {isProcessing ? (
            <div className="space-y-3">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
              <div>
                <p className="font-medium">{t('upload.analyzing')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('upload.aiExtracting')}
                </p>
              </div>
            </div>
          ) : selectedFile && error ? (
            <div className="space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <div>
                <p className="font-medium text-destructive">{t('upload.errorTitle')}</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('upload.clickToRetry')}
                </p>
              </div>
            </div>
          ) : selectedFile && analysisResult ? (
            <div className="space-y-3">
              <CheckCircle className="h-10 w-10 mx-auto text-green-600" />
              <div>
                <p className="font-medium text-green-600">{t('upload.analysisComplete')}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedFile.name}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
              >
                {t('upload.uploadAnother')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                isDragging ? 'bg-primary/20' : 'bg-muted'
              }`}>
                {isDragging ? (
                  <FileText className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {isDragging ? t('upload.dropHere') : t('upload.dragOrClick')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('upload.fileTypes')}
                </p>
              </div>
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="mt-4 space-y-3 bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('upload.aiAnalysisTitle')}
            </h4>
            
            <div className="space-y-2">
              <p className="text-sm">{analysisResult.resumo}</p>
              
              {analysisResult.pontos_principais.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">{t('upload.mainPoints')}:</p>
                  <ul className="text-sm space-y-1">
                    {analysisResult.pontos_principais.map((ponto, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {ponto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysisResult.recomendacoes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">{t('upload.recommendations')}:</p>
                  <ul className="text-sm space-y-1">
                    {analysisResult.recomendacoes.map((rec, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <span>{t('upload.confidence')}:</span>
                <span className={`font-medium ${
                  analysisResult.confianca >= 80 ? 'text-green-600' :
                  analysisResult.confianca >= 60 ? 'text-yellow-600' : 'text-orange-600'
                }`}>
                  {analysisResult.confianca}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
