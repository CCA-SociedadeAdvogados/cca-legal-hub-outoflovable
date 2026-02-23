import { Bot, Shield, Clock, Cpu, FileCheck, Fingerprint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TriageAuditBadgeProps {
  analysisId: string;
  analyzedAt: string;
  aiModel?: string;
  textSource: string;
  textLength: number;
}

export function TriageAuditBadge({ 
  analysisId, 
  analyzedAt, 
  aiModel = 'google/gemini-3-flash-preview',
  textSource,
  textLength
}: TriageAuditBadgeProps) {
  const modelDisplayName = aiModel.includes('gemini') 
    ? 'Gemini (Google)' 
    : aiModel.includes('gpt-5') 
      ? 'GPT-5 (OpenAI)' 
      : aiModel;

  const modelIcon = aiModel.includes('gemini') ? '✨' : '🧠';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Análise Gerada por IA</h4>
            <p className="text-xs text-muted-foreground">Processamento 100% Automatizado</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Auditável
          </Badge>
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* AI Model */}
          <div className="flex items-start gap-2">
            <Cpu className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Modelo de IA</p>
              <p className="font-medium flex items-center gap-1">
                <span>{modelIcon}</span>
                {modelDisplayName}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Data/Hora</p>
              <p className="font-medium">
                {format(new Date(analyzedAt), "d MMM yyyy 'às' HH:mm", { locale: pt })}
              </p>
            </div>
          </div>

          {/* Source */}
          <div className="flex items-start gap-2">
            <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Fonte dos Dados</p>
              <p className="font-medium">
                {textSource === 'pdf' ? 'Documento PDF' : 'Base de Dados'}
              </p>
              <p className="text-muted-foreground">{textLength.toLocaleString()} caracteres</p>
            </div>
          </div>

          {/* Analysis ID */}
          <div className="flex items-start gap-2">
            <Fingerprint className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">ID da Análise</p>
              <p className="font-mono text-[10px] break-all">{analysisId}</p>
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Trilho de auditoria registado automaticamente</span>
          </div>
          <span className="font-mono bg-muted px-2 py-0.5 rounded">CCA AI Agent v1.0</span>
        </div>
      </CardContent>
    </Card>
  );
}
