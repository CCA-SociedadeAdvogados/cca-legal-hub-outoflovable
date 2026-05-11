import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

import { AppLayout } from '@/components/layout/AppLayout';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarClock,
  Euro,
  AlertTriangle,
  Clock,
  Loader2,
  Calendar,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  date: Date;
  daysUntil: number;
  title: string;
  subtitle?: string;
  type: 'expiration' | 'renewal_deadline' | 'financial' | 'guarantee';
  contractId?: string;
  urgency: 'critical' | 'warning' | 'normal';
}

function generateICS(events: TimelineEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CCA Legal Hub//Prazos//PT',
    'CALSCALE:GREGORIAN',
  ];

  events.forEach((event) => {
    const dateStr = format(event.date, "yyyyMMdd'T'000000");
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`DTEND:${dateStr}`);
    lines.push(`SUMMARY:${event.title}`);
    if (event.subtitle) lines.push(`DESCRIPTION:${event.subtitle}`);
    lines.push(`UID:${event.id}@ccalegalhub`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(events: TimelineEvent[]) {
  const ics = generateICS(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prazos_${format(new Date(), 'yyyy-MM-dd')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PrazosTimeline() {
  const { t } = useTranslation();
  const { contratos, isLoading: isLoadingContratos } = useContratos();
  const { financialItems, isLoading: isLoadingFinanceiro } = useFinanceiro();
  const [tab, setTab] = useState('all');

  const events = useMemo<TimelineEvent[]>(() => {
    const now = new Date();
    const result: TimelineEvent[] = [];

    // Contract expirations
    (contratos ?? [])
      .filter((c) => !c.arquivado && c.estado_contrato === 'activo')
      .forEach((c) => {
        if (c.data_termo) {
          const date = new Date(c.data_termo);
          const daysUntil = differenceInDays(date, now);
          if (daysUntil > 0 && daysUntil <= 365) {
            result.push({
              id: `exp-${c.id}`,
              date,
              daysUntil,
              title: c.titulo_contrato,
              subtitle: c.parte_b_nome_legal || undefined,
              type: 'expiration',
              contractId: c.id,
              urgency: daysUntil <= 30 ? 'critical' : daysUntil <= 90 ? 'warning' : 'normal',
            });
          }
        }

        // Renewal decision deadline
        if (c.data_limite_decisao_renovacao) {
          const date = new Date(c.data_limite_decisao_renovacao);
          const daysUntil = differenceInDays(date, now);
          if (daysUntil > 0 && daysUntil <= 365) {
            result.push({
              id: `ren-${c.id}`,
              date,
              daysUntil,
              title: `${t('prazos.renewalDeadline', 'Limite decisão renovação')}: ${c.titulo_contrato}`,
              subtitle: c.parte_b_nome_legal || undefined,
              type: 'renewal_deadline',
              contractId: c.id,
              urgency: daysUntil <= 15 ? 'critical' : daysUntil <= 45 ? 'warning' : 'normal',
            });
          }
        }

        // Guarantee expiry
        if (c.garantia_existente && c.garantia_data_validade) {
          const date = new Date(c.garantia_data_validade);
          const daysUntil = differenceInDays(date, now);
          if (daysUntil > 0 && daysUntil <= 365) {
            result.push({
              id: `gar-${c.id}`,
              date,
              daysUntil,
              title: `${t('prazos.guaranteeExpiry', 'Garantia expira')}: ${c.titulo_contrato}`,
              type: 'guarantee',
              contractId: c.id,
              urgency: daysUntil <= 30 ? 'critical' : daysUntil <= 60 ? 'warning' : 'normal',
            });
          }
        }
      });

    // Financial due dates
    (financialItems ?? []).forEach((item) => {
      if (item.data_vencimento && item.estado !== 'pago') {
        const date = new Date(item.data_vencimento);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > -30 && daysUntil <= 180) {
          result.push({
            id: `fin-${item.id}`,
            date,
            daysUntil,
            title: `${t('prazos.invoiceDue', 'Fatura')}: ${item.numero_documento || item.id}`,
            subtitle: item.valor_pendente
              ? `€${Number(item.valor_pendente).toLocaleString('pt-PT')}`
              : undefined,
            type: 'financial',
            urgency: daysUntil <= 0 ? 'critical' : daysUntil <= 15 ? 'warning' : 'normal',
          });
        }
      }
    });

    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contratos, financialItems, t]);

  const filteredEvents = tab === 'all' ? events : events.filter((e) => e.type === tab);
  const isLoading = isLoadingContratos || isLoadingFinanceiro;

  const criticalCount = events.filter((e) => e.urgency === 'critical').length;
  const warningCount = events.filter((e) => e.urgency === 'warning').length;
  const next30 = events.filter((e) => e.daysUntil <= 30).length;

  const typeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'expiration':
        return <CalendarClock className="h-4 w-4" />;
      case 'renewal_deadline':
        return <Clock className="h-4 w-4" />;
      case 'financial':
        return <Euro className="h-4 w-4" />;
      case 'guarantee':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const typeLabel = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'expiration':
        return t('prazos.expiration', 'Expiração');
      case 'renewal_deadline':
        return t('prazos.renewal', 'Renovação');
      case 'financial':
        return t('prazos.financial', 'Financeiro');
      case 'guarantee':
        return t('prazos.guarantee', 'Garantia');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              {t('prazos.title', 'Prazos e Datas Críticas')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('prazos.subtitle', 'Todas as datas importantes numa vista cronológica')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadICS(filteredEvents)}
            disabled={filteredEvents.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('prazos.exportICS', 'Exportar .ics')}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {t('prazos.totalEvents', 'Total Datas')}
              </p>
              <p className="text-2xl font-bold">{events.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {t('prazos.next30', 'Próximos 30 dias')}
              </p>
              <p className="text-2xl font-bold text-danger">{next30}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t('prazos.critical', 'Críticos')}</p>
              <p className="text-2xl font-bold text-danger">{criticalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t('prazos.warnings', 'Atenção')}</p>
              <p className="text-2xl font-bold text-warn">{warningCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs by type */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t('prazos.all', 'Todos')} ({events.length})
            </TabsTrigger>
            <TabsTrigger value="expiration">{t('prazos.expirations', 'Expirações')}</TabsTrigger>
            <TabsTrigger value="renewal_deadline">{t('prazos.renewals', 'Renovações')}</TabsTrigger>
            <TabsTrigger value="financial">{t('prazos.financialTab', 'Financeiro')}</TabsTrigger>
            <TabsTrigger value="guarantee">{t('prazos.guarantees', 'Garantias')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Timeline */}
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarClock className="h-12 w-12 text-positive mb-4" />
              <p className="text-lg font-medium">{t('prazos.noDates', 'Sem datas pendentes')}</p>
              <p className="text-sm text-muted-foreground">
                {t('prazos.noEventsDesc', 'Não existem prazos relevantes no período')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <Card
                key={event.id}
                className={cn(
                  'transition-colors',
                  event.urgency === 'critical' && 'border-danger/30',
                  event.urgency === 'warning' && 'border-warn/30',
                )}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                      event.urgency === 'critical'
                        ? 'bg-danger/10 text-danger'
                        : event.urgency === 'warning'
                          ? 'bg-warn/10 text-warn'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {typeIcon(event.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.contractId ? (
                        <Link
                          to={`/contratos/${event.contractId}`}
                          className="font-medium hover:underline truncate"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <span className="font-medium truncate">{event.title}</span>
                      )}
                      <Badge variant="outline" className="text-xs shrink-0">
                        {typeLabel(event.type)}
                      </Badge>
                    </div>
                    {event.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">{event.subtitle}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {format(event.date, 'd MMM yyyy', { locale: pt })}
                    </p>
                    <Badge
                      variant={
                        event.urgency === 'critical'
                          ? 'destructive'
                          : event.urgency === 'warning'
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {event.daysUntil <= 0
                        ? t('prazos.overdue', 'Vencido')
                        : `${event.daysUntil}d`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
