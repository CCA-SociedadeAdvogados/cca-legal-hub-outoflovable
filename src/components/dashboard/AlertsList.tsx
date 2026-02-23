import { Alert } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, ChevronRight, FileCheck, Scale, ClipboardList } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface AlertsListProps {
  alerts: Alert[];
  maxItems?: number;
}

export function AlertsList({ alerts, maxItems = 5 }: AlertsListProps) {
  const displayedAlerts = alerts.slice(0, maxItems);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'contract_expiry':
        return FileCheck;
      case 'auto_renewal':
        return Calendar;
      case 'regulatory_impact':
        return Scale;
      case 'pending_analysis':
        return ClipboardList;
      default:
        return AlertTriangle;
    }
  };

  const getRiskVariant = (severity: Alert['severity']) => {
    switch (severity) {
      case 'ALTO':
        return 'riskHigh';
      case 'MEDIO':
        return 'riskMedium';
      case 'BAIXO':
        return 'riskLow';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Alertas Proactivos</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent">
          Ver todos
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedAlerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Não existem alertas pendentes
          </p>
        ) : (
          displayedAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getRiskVariant(alert.severity)} className="text-[10px]">
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{alert.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
