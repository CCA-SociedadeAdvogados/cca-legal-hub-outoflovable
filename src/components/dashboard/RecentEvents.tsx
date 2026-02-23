import { RegulatoryEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ExternalLink, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface RecentEventsProps {
  events: RegulatoryEvent[];
  maxItems?: number;
}

export function RecentEvents({ events, maxItems = 4 }: RecentEventsProps) {
  const displayedEvents = events
    .filter(e => e.estado === 'ACTIVO')
    .sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime())
    .slice(0, maxItems);

  const getStatusVariant = (estado: RegulatoryEvent['estado']) => {
    switch (estado) {
      case 'ACTIVO':
        return 'active';
      case 'RASCUNHO':
        return 'pending';
      case 'REVOGADO':
        return 'expired';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Eventos Legislativos Recentes</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent">
          Ver todos
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedEvents.map((event) => (
          <div
            key={event.id}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getStatusVariant(event.estado)} className="text-[10px]">
                      {event.estado}
                    </Badge>
                    <Badge variant="subtle" className="text-[10px]">
                      {event.areaDireito}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm">{event.titulo}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{event.referenciaLegal}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Entrada em vigor: {format(new Date(event.dataEntradaVigor), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                </div>
              </div>
              {event.linkOficial && (
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
