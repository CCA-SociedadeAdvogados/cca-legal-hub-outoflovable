import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Scale, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  Download, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  useContratoNormativos, 
  useMatchLegislation, 
  useRemoveContratoNormativo,
  getStorageUrl 
} from '@/hooks/useContratoNormativos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContratoLegislacaoProps {
  contratoId: string;
}

const sourceLabels: Record<string, string> = {
  dre: 'Diário da República',
  bdp: 'Banco de Portugal',
  asf: 'ASF',
  cmvm: 'CMVM'
};

export function ContratoLegislacao({ contratoId }: ContratoLegislacaoProps) {
  const { data: normativos, isLoading, error } = useContratoNormativos(contratoId);
  const matchMutation = useMatchLegislation();
  const removeMutation = useRemoveContratoNormativo();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleMatch = () => {
    matchMutation.mutate(contratoId);
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    removeMutation.mutate({ id, contratoId }, {
      onSettled: () => setRemovingId(null)
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Legislação Aplicável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Legislação Aplicável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Erro ao carregar legislação associada</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Legislação Aplicável
        </CardTitle>
        <Button 
          onClick={handleMatch} 
          disabled={matchMutation.isPending}
          size="sm"
          variant="outline"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {matchMutation.isPending ? 'A analisar...' : 'Encontrar Legislação'}
        </Button>
      </CardHeader>
      <CardContent>
        {(!normativos || normativos.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma legislação associada a este contrato.</p>
            <p className="text-sm mt-1">
              Clique em "Encontrar Legislação" para identificar automaticamente os normativos relevantes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {normativos.map((item) => (
              <div 
                key={item.id} 
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium truncate">
                        {item.documento?.title || 'Documento sem título'}
                      </h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.documento?.source_key && (
                        <Badge variant="secondary" className="text-xs">
                          {sourceLabels[item.documento.source_key] || item.documento.source_key}
                        </Badge>
                      )}
                      <Badge 
                        variant={item.tipo_associacao === 'automatico' ? 'outline' : 'default'}
                        className="text-xs"
                      >
                        {item.tipo_associacao === 'automatico' ? 'Auto' : 'Manual'}
                      </Badge>
                      {item.relevancia_score && (
                        <Badge variant="outline" className="text-xs">
                          Relevância: {Math.round(item.relevancia_score * 100)}%
                        </Badge>
                      )}
                    </div>
                    
                    {item.motivo_associacao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.motivo_associacao}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.documento?.storage_path && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a 
                          href={getStorageUrl(item.documento.storage_path) || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Download cópia"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    {item.documento?.canonical_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a 
                          href={item.documento.canonical_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Ver fonte oficial"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={removingId === item.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover associação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá remover a associação entre este contrato e o documento legal.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(item.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
