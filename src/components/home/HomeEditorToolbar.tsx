import { Pencil, Save, Upload, RotateCcw, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HomeEditorToolbarProps {
  hasDraftChanges: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onRevert: () => void;
  onOpenEditor: () => void;
  isSaving: boolean;
  isPublishing: boolean;
}

export function HomeEditorToolbar({
  hasDraftChanges,
  onSaveDraft,
  onPublish,
  onRevert,
  onOpenEditor,
  isSaving,
  isPublishing,
}: HomeEditorToolbarProps) {
  return (
    <div className="sticky top-12 z-40 bg-blue-500/10 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20">
          <Pencil className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-blue-800">
            Modo de Edição
          </span>
          <span className="text-xs text-blue-600">
            Está a editar a página inicial desta organização
          </span>
        </div>
        {hasDraftChanges && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Alterações não publicadas
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenEditor}
          className="gap-1"
        >
          <LayoutGrid className="h-4 w-4" />
          Editar Widgets
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRevert}
          disabled={!hasDraftChanges || isSaving || isPublishing}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Reverter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={isSaving || isPublishing}
          className="gap-1"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'A guardar...' : 'Guardar Rascunho'}
        </Button>
        <Button
          size="sm"
          onClick={onPublish}
          disabled={isSaving || isPublishing}
          className="gap-1"
        >
          <Upload className="h-4 w-4" />
          {isPublishing ? 'A publicar...' : 'Publicar'}
        </Button>
      </div>
    </div>
  );
}
