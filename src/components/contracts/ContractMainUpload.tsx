import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAnexos } from '@/hooks/useAnexos';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContractMainUploadProps {
  contratoId: string;
  storagePath?: string; // caminho do ficheiro no bucket 'contracts'
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ContractMainUpload({ contratoId, storagePath }: ContractMainUploadProps) {
  const { anexos, isLoading, uploadAnexo, deleteAnexo, downloadAnexo } = useAnexos(contratoId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof anexos extends (infer T)[] | undefined ? T : never | null>(null);

  // Find the main PDF contract
  const mainContract = anexos?.find(a => a.tipo_anexo === 'pdf_principal');

  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const isValidFile = (file: File) => {
    return acceptedTypes.includes(file.type) || 
           file.name.endsWith('.pdf') || 
           file.name.endsWith('.doc') || 
           file.name.endsWith('.docx');
  };

  const handleUpload = async (file: File) => {
    if (!isValidFile(file)) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadAnexo.mutateAsync({
        file,
        tipoAnexo: 'pdf_principal',
        descricao: 'Documento principal do contrato',
      });

      // Após upload bem-sucedido: marcar como 'validating' e invocar agente externo
      const uploadedPath = (result as any)?.url_ficheiro ?? storagePath ?? '';

      await supabase
        .from('contratos')
        .update({ validation_status: 'validating' } as any)
        .eq('id', contratoId);

      // Fire-and-forget: chamar agente CCA externo
      import('@/lib/ccaAgent').then(({ callCCAAgent }) => {
        callCCAAgent({
          contractId: contratoId,
          documentPath: uploadedPath,
          extractionDraft: {},
        });
      }).catch(() => {
        // Silencioso — não bloqueia o utilizador
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
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
    if (file && !isUploading) {
      handleUpload(file);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteAnexo.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {mainContract ? (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{mainContract.nome_ficheiro}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(mainContract.tamanho_bytes)} • Documento principal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadAnexo(mainContract)}
            >
              <Download className="h-4 w-4 mr-1" />
              Descarregar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(mainContract)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
              <p className="font-medium">A carregar...</p>
            </>
          ) : (
            <>
              <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="font-medium">
                {isDragging ? 'Largue o ficheiro aqui' : 'Clique ou arraste o contrato'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, DOC ou DOCX (máx. 10MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ficheiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser revertida. O ficheiro será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
