import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ExtractedContractData {
  titulo_contrato?: string;
  tipo_contrato?: string;
  objeto_resumido?: string;
  parte_a_nome_legal?: string;
  parte_a_nif?: string;
  parte_a_morada?: string;
  parte_a_representante?: string;
  parte_a_cargo?: string;
  parte_b_nome_legal?: string;
  parte_b_nif?: string;
  parte_b_morada?: string;
  parte_b_representante?: string;
  parte_b_cargo?: string;
  data_assinatura?: string;
  data_inicio_vigencia?: string;
  data_termo?: string;
  valor_total_estimado?: number;
  valor_mensal?: number;
  moeda?: string;
  iva_incluido?: boolean;
  prazo_pagamento_dias?: number;
  periodicidade_faturacao?: string;
  tipo_duracao?: string;
  duracao_meses?: number;
  tipo_renovacao?: string;
  renovacao_periodo_meses?: number;
  aviso_denuncia_dias?: number;
  obrigacoes_parte_a?: string;
  obrigacoes_parte_b?: string;
  sla_indicadores?: string;
  clausulas_importantes?: string[];
  clausulas_especiais?: {
    confidencialidade?: boolean;
    nao_concorrencia?: boolean;
    exclusividade?: boolean;
    propriedade_intelectual?: boolean;
    protecao_dados?: boolean;
    subcontratacao?: boolean;
    penalidades?: boolean;
    resolucao_litigios?: string;
  };
  riscos_identificados?: string[];
  recomendacoes?: string[];
  foro_competente?: string;
  lei_aplicavel?: string;
  sumario_executivo?: string;
  confianca?: number;
}

interface ContractInitialUploadProps {
  onDataExtracted: (data: ExtractedContractData, file: File, extractedText: string) => void;
  onSkip: () => void;
}

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'parsing' | 'complete' | 'error';

export function ContractInitialUpload({ onDataExtracted, onSkip }: ContractInitialUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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

  const getStepMessage = (step: ProcessingStep) => {
    switch (step) {
      case 'uploading': return 'A carregar ficheiro...';
      case 'extracting': return 'A extrair texto do documento...';
      case 'parsing': return 'A analisar dados do contrato com IA...';
      case 'complete': return 'Extracção completa!';
      case 'error': return 'Erro no processamento';
      default: return '';
    }
  };

  const processFile = async (file: File) => {
    if (!isValidFile(file)) {
      setError('Formato de ficheiro não suportado. Use PDF, Word ou TXT.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('O ficheiro é demasiado grande. Máximo 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setProcessingStep('uploading');
    setProgress(15);

    try {
      // Step 1: Read file
      setProcessingStep('extracting');
      setProgress(40);
      const isTextFile = file.type === 'text/plain' || file.name.endsWith('.txt');
      const content = await readFileAsText(file);

      // Step 2: Parse contract with AI (Lovable parse-contract)
      setProcessingStep('parsing');
      setProgress(75);
      
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-contract', {
        body: isTextFile 
          ? { textContent: content }
          : { fileContent: content, fileName: file.name, mimeType: file.type }
      });

      if (parseError) {
        throw new Error(parseError.message);
      }

      if (parseData?.error) {
        throw new Error(parseData.error);
      }

      const extractedData = parseData?.data;
      const extractedText = parseData?.extractedText || '';

      if (!extractedData) {
        throw new Error('Não foi possível extrair dados do contrato');
      }

      // Step 3: Complete — análise de risco será feita pelo agente externo após criação do contrato
      setProcessingStep('complete');
      setProgress(100);

      const confidenceDisplay = extractedData.confianca ? `${extractedData.confianca}%` : 'N/A';

      toast({
        title: 'Extracção completa',
        description: `Confiança: ${confidenceDisplay} — A análise de risco será feita pelo CCA.`,
      });

      // Small delay to show complete state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onDataExtracted(extractedData, file, extractedText);
      
    } catch (err: any) {
      console.error('Error processing file:', err);
      setProcessingStep('error');
      setError(err.message || 'Erro ao processar o ficheiro');
      toast({
        title: 'Erro ao processar',
        description: err.message || 'Não foi possível extrair os dados do contrato',
        variant: 'destructive',
      });
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
    if (file && processingStep === 'idle') {
      processFile(file);
    }
  };

  const handleRetry = () => {
    setProcessingStep('idle');
    setError(null);
    setProgress(0);
    setSelectedFile(null);
  };

  const isProcessing = !['idle', 'complete', 'error'].includes(processingStep);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Carregar Contrato</h2>
          <p className="text-muted-foreground">
            Carregue o documento e a IA extrairá os dados. A análise de risco será feita pelo agente CCA.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
        />

        <div
          onClick={() => processingStep === 'idle' && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            processingStep === 'idle' ? 'cursor-pointer' : 'cursor-default'
          } ${
            isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02]' 
              : processingStep === 'error'
                ? 'border-destructive/50'
                : processingStep === 'complete'
                  ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                  : 'hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <div>
                <p className="font-medium">{getStepMessage(processingStep)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFile?.name}
                </p>
              </div>
              <Progress value={progress} className="max-w-xs mx-auto" />
            </div>
          ) : processingStep === 'complete' ? (
            <div className="space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="font-medium text-green-600">Extracção completa!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A redirecionar para o formulário...
                </p>
              </div>
            </div>
          ) : processingStep === 'error' ? (
            <div className="space-y-3">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro no processamento</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={handleRetry}>
                Tentar novamente
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
                  {isDragging ? 'Largue o ficheiro aqui' : 'Arraste o contrato ou clique para selecionar'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, Word ou TXT (máx. 10MB)
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Button 
            variant="ghost" 
            onClick={onSkip}
            disabled={isProcessing}
          >
            Preencher manualmente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
