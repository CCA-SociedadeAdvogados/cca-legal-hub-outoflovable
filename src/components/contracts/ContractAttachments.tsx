import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  File,
  FilePlus,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAnexos, type Anexo } from '@/hooks/useAnexos';

interface ContractAttachmentsProps {
  contratoId: string;
  canEdit?: boolean;
}

const getTipoAnexoIcon = (tipo: string) => {
  switch (tipo) {
    case 'pdf_principal':
      return FileCheck;
    case 'adenda':
      return FilePlus;
    case 'anexo':
      return File;
    default:
      return FileText;
  }
};

const getTipoAnexoLabel = (tipo: string) => {
  switch (tipo) {
    case 'pdf_principal':
      return 'Documento Principal';
    case 'adenda':
      return 'Adenda';
    case 'anexo':
      return 'Anexo';
    default:
      return 'Outro';
  }
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ContractAttachments({ contratoId, canEdit = false }: ContractAttachmentsProps) {
  const { anexos, isLoading, uploadAnexo, deleteAnexo, downloadAnexo } = useAnexos(contratoId);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoAnexo, setTipoAnexo] = useState<'pdf_principal' | 'anexo' | 'adenda' | 'outro'>('anexo');
  const [descricao, setDescricao] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Anexo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await uploadAnexo.mutateAsync({
      file: selectedFile,
      tipoAnexo,
      descricao: descricao || undefined,
    });
    
    setIsUploadDialogOpen(false);
    setSelectedFile(null);
    setTipoAnexo('anexo');
    setDescricao('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteAnexo.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
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
      {canEdit && (
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Carregar Ficheiro
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {anexos?.map((anexo) => {
          const Icon = getTipoAnexoIcon(anexo.tipo_anexo);

          return (
            <div
              key={anexo.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{anexo.nome_ficheiro}</span>
                  <Badge variant="outline" className="shrink-0">
                    {getTipoAnexoLabel(anexo.tipo_anexo)}
                  </Badge>
                </div>
                {anexo.descricao && (
                  <p className="text-sm text-muted-foreground truncate">
                    {anexo.descricao}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(anexo.tamanho_bytes)}</span>
                  <span>•</span>
                  <span>
                    {format(new Date(anexo.uploaded_at), "d MMM yyyy", { locale: pt })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => downloadAnexo(anexo)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(anexo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {(!anexos || anexos.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum ficheiro anexado</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregar Ficheiro</DialogTitle>
            <DialogDescription>
              Configure o tipo e descrição do ficheiro antes de carregar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ficheiro Selecionado</Label>
              <p className="text-sm text-muted-foreground truncate">
                {selectedFile?.name}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipoAnexo">Tipo de Documento</Label>
              <Select value={tipoAnexo} onValueChange={(v: any) => setTipoAnexo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf_principal">Documento Principal</SelectItem>
                  <SelectItem value="anexo">Anexo</SelectItem>
                  <SelectItem value="adenda">Adenda</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Adenda de alteração de preços"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploadAnexo.isPending}
            >
              {uploadAnexo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Carregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Ficheiro</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar "{deleteConfirm?.nome_ficheiro}"? Esta ação não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAnexo.isPending}
            >
              {deleteAnexo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
