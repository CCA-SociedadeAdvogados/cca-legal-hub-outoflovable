import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Settings2,
  Building2,
  Scale,
  Newspaper,
  FileText,
  Clock,
  Link2,
  MessageSquare,
  Folder,
  Lightbulb
} from 'lucide-react';
import { HomeLayout, WidgetConfig, WidgetType, WIDGET_TYPES } from '@/lib/defaultHomeLayout';
import { WidgetConfigEditor } from './WidgetConfigEditor';

interface HomeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: HomeLayout;
  onLayoutChange: (layout: HomeLayout) => void;
  organizationId: string | null;
}

const widgetIcons: Record<WidgetType, React.ElementType> = {
  ORGANIZATION_CARD: Building2,
  LAWYER_CARD: Scale,
  CCA_NEWS: Newspaper,
  RECENT_CONTRACTS: FileText,
  RECENT_DOCUMENTS: Folder,
  EXPIRING_CONTRACTS: Clock,
  QUICK_LINKS: Link2,
  WELCOME_MESSAGE: MessageSquare,
  LEGAL_INSIGHTS: Lightbulb,
};

export function HomeEditor({ open, onOpenChange, layout, onLayoutChange, organizationId }: HomeEditorProps) {
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);

  const activeWidgets = [...layout.widgets].sort((a, b) => a.order - b.order);
  const availableTypes = WIDGET_TYPES.filter(
    wt => !layout.widgets.some(w => w.type === wt.type)
  );

  const handleToggleVisibility = (widgetId: string) => {
    const updated = layout.widgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    onLayoutChange({ ...layout, widgets: updated });
  };

  const handleRemoveWidget = (widgetId: string) => {
    const updated = layout.widgets.filter(w => w.id !== widgetId);
    // Reorder remaining widgets
    const reordered = updated.map((w, idx) => ({ ...w, order: idx }));
    onLayoutChange({ ...layout, widgets: reordered });
  };

  const handleAddWidget = (type: WidgetType) => {
    const widgetInfo = WIDGET_TYPES.find(wt => wt.type === type);
    if (!widgetInfo) return;

    const newWidget: WidgetConfig = {
      id: `widget-${type.toLowerCase()}-${Date.now()}`,
      type,
      order: layout.widgets.length,
      visible: true,
      title: widgetInfo.label,
      config: getDefaultConfig(type),
    };

    onLayoutChange({ ...layout, widgets: [...layout.widgets, newWidget] });
  };

  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const sorted = [...layout.widgets].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(w => w.id === widgetId);
    
    if (direction === 'up' && index > 0) {
      [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
    } else if (direction === 'down' && index < sorted.length - 1) {
      [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
    }

    const reordered = sorted.map((w, idx) => ({ ...w, order: idx }));
    onLayoutChange({ ...layout, widgets: reordered });
  };

  const handleUpdateWidgetConfig = (widgetId: string, updates: Partial<WidgetConfig>) => {
    const updated = layout.widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    );
    onLayoutChange({ ...layout, widgets: updated });
    setEditingWidget(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Widgets da Home</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Active Widgets */}
            <div>
              <h3 className="text-sm font-medium mb-3">Widgets Ativos</h3>
              <div className="space-y-2">
                {activeWidgets.map((widget, index) => {
                  const Icon = widgetIcons[widget.type] || FileText;
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveWidget(widget.id, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveWidget(widget.id, 'down')}
                          disabled={index === activeWidgets.length - 1}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>
                      
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{widget.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {WIDGET_TYPES.find(wt => wt.type === widget.type)?.description}
                        </p>
                      </div>

                      {!widget.visible && (
                        <Badge variant="secondary" className="text-xs">Oculto</Badge>
                      )}

                      <Switch
                        checked={widget.visible}
                        onCheckedChange={() => handleToggleVisibility(widget.id)}
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingWidget(widget)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveWidget(widget.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Available Widgets */}
            {availableTypes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Adicionar Widget</h3>
                <div className="space-y-2">
                  {availableTypes.map((widgetType) => {
                    const Icon = widgetIcons[widgetType.type] || FileText;
                    return (
                      <div
                        key={widgetType.type}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{widgetType.label}</p>
                          <p className="text-xs text-muted-foreground">{widgetType.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddWidget(widgetType.type)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {editingWidget && (
        <WidgetConfigEditor
          open={!!editingWidget}
          onOpenChange={(open) => !open && setEditingWidget(null)}
          widget={editingWidget}
          organizationId={organizationId}
          onSave={(updates) => handleUpdateWidgetConfig(editingWidget.id, updates)}
        />
      )}
    </>
  );
}

function getDefaultConfig(type: WidgetType): Record<string, unknown> {
  switch (type) {
    case 'CCA_NEWS':
      return { limit: 3, showDate: true };
    case 'RECENT_CONTRACTS':
      return { limit: 5, showStatus: true };
    case 'RECENT_DOCUMENTS':
      return { limit: 5, showDate: true };
    case 'EXPIRING_CONTRACTS':
      return { daysAhead: 30 };
    case 'QUICK_LINKS':
      return {
        links: [
          { label: 'Contratos', path: '/contratos', icon: 'FileText' },
          { label: 'Documentos', path: '/documentos', icon: 'Folder' },
          { label: 'Eventos', path: '/eventos', icon: 'Calendar' },
        ],
      };
    case 'WELCOME_MESSAGE':
      return { contentBlockKey: 'welcome_message' };
    case 'LEGAL_INSIGHTS':
      return { limit: 5, showDate: true };
    default:
      return {};
  }
}
