import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileText,
  PenTool,
  Play,
  RefreshCw,
  FilePlus,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Edit,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEventos, type EventoCicloVida, type TipoEvento } from '@/hooks/useEventos';
import { TIPO_EVENTO_CICLO_VIDA_LABELS } from '@/types/contracts';
import { getValidEventsForState, getStateChangeForEvent } from '@/lib/contractStateMachine';
import { useContratos } from '@/hooks/useContratos';

interface ContractTimelineProps {
  contratoId: string;
  canEdit?: boolean;
  estadoContrato?: string;
}

const getEventIcon = (tipo: string) => {
  switch (tipo) {
    case 'criacao':
      return FileText;
    case 'assinatura':
      return PenTool;
    case 'inicio_vigencia':
      return Play;
    case 'renovacao':
      return RefreshCw;
    case 'adenda':
      return FilePlus;
    case 'rescisao':
      return XCircle;
    case 'denuncia':
      return AlertCircle;
    case 'expiracao':
      return Clock;
    case 'nota_interna':
      return MessageSquare;
    case 'alteracao':
      return Edit;
    default:
      return FileText;
  }
};

const getEventColor = (tipo: string) => {
  switch (tipo) {
    case 'criacao':
      return 'bg-primary';
    case 'assinatura':
      return 'bg-risk-low';
    case 'inicio_vigencia':
      return 'bg-risk-low';
    case 'renovacao':
      return 'bg-primary';
    case 'adenda':
      return 'bg-primary/80';
    case 'rescisao':
      return 'bg-destructive';
    case 'denuncia':
      return 'bg-risk-medium';
    case 'expiracao':
      return 'bg-muted-foreground';
    case 'nota_interna':
      return 'bg-risk-medium';
    case 'alteracao':
      return 'bg-primary/70';
    default:
      return 'bg-muted-foreground';
  }
};

const TIPO_EVENTO_OPTIONS: { value: TipoEvento; label: string }[] = [
  { value: 'criacao', label: 'Criação' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'inicio_vigencia', label: 'Início de Vigência' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'adenda', label: 'Adenda' },
  { value: 'rescisao', label: 'Rescisão' },
  { value: 'denuncia', label: 'Denúncia' },
  { value: 'expiracao', label: 'Expiração' },
  { value: 'nota_interna', label: 'Nota Interna' },
  { value: 'alteracao', label: 'Alteração' },
];

export function ContractTimeline({ contratoId, canEdit = false, estadoContrato }: ContractTimelineProps) {
  const { eventos, isLoading, createEvento } = useEventos(contratoId);
  const { updateContrato } = useContratos();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>('nota_interna');
  const [descricao, setDescricao] = useState('');
  const [dataEvento, setDataEvento] = useState(new Date().toISOString().split('T')[0]);

  const availableEventTypes = estadoContrato 
    ? getValidEventsForState(estadoContrato as any)
    : ['nota_interna', 'alteracao'];
  
  const filteredEventOptions = TIPO_EVENTO_OPTIONS.filter(
    option => availableEventTypes.includes(option.value)
  );

  const handleSubmit = async () => {
    await createEvento.mutateAsync({
      contrato_id: contratoId,
      tipo_evento: tipoEvento,
      descricao: descricao || undefined,
      data_evento: dataEvento,
    });
    
    // Auto-update contract state based on event
    const newState = getStateChangeForEvent(tipoEvento);
    if (newState && contratoId) {
      await updateContrato.mutateAsync({ 
        id: contratoId, 
        estado_contrato: newState as any 
      });
    }
    
    setIsDialogOpen(false);
    setTipoEvento('nota_interna');
    setDescricao('');
    setDataEvento(new Date().toISOString().split('T')[0]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedEventos = [...(eventos || [])].sort(
    (a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime()
  );

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Evento
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {sortedEventos.map((evento, index) => {
          const Icon = getEventIcon(evento.tipo_evento);
          const colorClass = getEventColor(evento.tipo_evento);

          return (
            <div key={evento.id} className="flex gap-4">
              {/* Timeline Line and Icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass} text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {index < sortedEventos.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border mt-2" />
                )}
              </div>

              {/* Event Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium">
                      {TIPO_EVENTO_CICLO_VIDA_LABELS[evento.tipo_evento as keyof typeof TIPO_EVENTO_CICLO_VIDA_LABELS] || evento.tipo_evento}
                    </h4>
                    {evento.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {evento.descricao}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground shrink-0">
                    <div>
                      {format(new Date(evento.data_evento), "d MMM yyyy", {
                        locale: pt,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {sortedEventos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum evento registado</p>
            {canEdit && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeiro evento
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evento</DialogTitle>
            <DialogDescription>
              Registe um novo evento no ciclo de vida do contrato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipoEvento">Tipo de Evento</Label>
              <Select value={tipoEvento} onValueChange={(v) => setTipoEvento(v as TipoEvento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredEventOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataEvento">Data do Evento</Label>
              <Input
                id="dataEvento"
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Adicione uma descrição ou notas sobre este evento..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createEvento.isPending}
            >
              {createEvento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
