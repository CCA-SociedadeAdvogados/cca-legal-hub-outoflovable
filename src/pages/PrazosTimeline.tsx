import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

import { AppLayout } from '@/components/layout/AppLayout';
import { useContratos } from '@/hooks/useContratos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarClock,
  Euro,
  AlertTriangle,
  Clock,
  Loader2,
  Download,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Eyebrow, KPI, Pill, GhostButton } from '@/components/cca';

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
  const navigate = useNavigate();
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
    (financialItems ?? []).forEach((item, index) => {
      if (item.data_vencimento) {
        const date = new Date(item.data_vencimento);
        const daysUntil = differenceInDays(date, now);
        if (daysUntil > -30 && daysUntil <= 180) {
          result.push({
            id: `fin-${index}-${item.numero_documento ?? 'doc'}`,
            date,
            daysUntil,
            title: `${t('prazos.invoiceDue', 'Fatura')}: ${item.numero_documento || item.descricao || '—'}`,
            subtitle: `€${Number(item.valor).toLocaleString('pt-PT')}`,
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
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-7 animate-fade-in">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('nav.deadlines')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('prazos.title', 'Prazos e Datas Críticas')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('prazos.subtitle', 'Todas as datas importantes numa vista cronológica')}
            </p>
          </header>
          <GhostButton
            onClick={() => downloadICS(filteredEvents)}
            disabled={filteredEvents.length === 0}
          >
            <Download className="h-4 w-4" />
            {t('prazos.exportICS', 'Exportar .ics')}
          </GhostButton>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label={t('prazos.totalEvents', 'Total Datas')} value={events.length} />
          <KPI
            label={t('prazos.next30', 'Próximos 30 dias')}
            value={<span className="text-danger">{next30}</span>}
          />
          <KPI
            label={t('prazos.critical', 'Críticos')}
            value={<span className="text-danger">{criticalCount}</span>}
          />
          <KPI
            label={t('prazos.warnings', 'Atenção')}
            value={<span className="text-warn">{warningCount}</span>}
          />
        </div>

        {/* Tabs by type */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap gap-1 rounded-control border border-line bg-bg-alt/60 p-1">
            <TabsTrigger
              value="all"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('prazos.all', 'Todos')} ({events.length})
            </TabsTrigger>
            <TabsTrigger
              value="expiration"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('prazos.expirations', 'Expirações')}
            </TabsTrigger>
            <TabsTrigger
              value="renewal_deadline"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('prazos.renewals', 'Renovações')}
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('prazos.financialTab', 'Financeiro')}
            </TabsTrigger>
            <TabsTrigger
              value="guarantee"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('prazos.guarantees', 'Garantias')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Timeline */}
        {filteredEvents.length === 0 ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <CalendarClock className="mb-4 h-12 w-12 text-ink-mute" strokeWidth={1.5} />
              <p className="font-display text-lg font-medium text-ink">
                {t('prazos.noDates', 'Sem datas pendentes')}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {t('prazos.noEventsDesc', 'Não existem prazos relevantes no período')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const actionable = Boolean(event.contractId);
              const openContract = () => {
                if (event.contractId) navigate(`/contratos/${event.contractId}`);
              };
              return (
                <Card
                  key={event.id}
                  onClick={actionable ? openContract : undefined}
                  role={actionable ? 'button' : undefined}
                  tabIndex={actionable ? 0 : undefined}
                  onKeyDown={
                    actionable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openContract();
                          }
                        }
                      : undefined
                  }
                  aria-label={
                    actionable
                      ? `${t('prazos.viewContract', 'Ver contrato')}: ${event.title}`
                      : undefined
                  }
                  className={cn(
                    'rounded-card border-line bg-surface transition-colors',
                    actionable && 'cursor-pointer hover:border-brand/40 hover:bg-bg-alt',
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
                            : 'bg-bg-alt text-ink-mute',
                      )}
                    >
                      {typeIcon(event.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink truncate">{event.title}</span>
                        <Pill tone="default" className="shrink-0">
                          {typeLabel(event.type)}
                        </Pill>
                      </div>
                      {event.subtitle && (
                        <p className="text-sm text-ink-soft truncate">{event.subtitle}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-display font-semibold tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
                        {format(event.date, 'd MMM yyyy', { locale: pt })}
                      </p>
                      <Pill
                        tone={
                          event.urgency === 'critical'
                            ? 'danger'
                            : event.urgency === 'warning'
                              ? 'warn'
                              : 'default'
                        }
                        className="mt-1 [font-variant-numeric:tabular-nums]"
                      >
                        {event.daysUntil <= 0
                          ? t('prazos.overdue', 'Vencido')
                          : `${event.daysUntil}d`}
                      </Pill>
                    </div>

                    {actionable && <ChevronRight className="h-4 w-4 text-ink-mute shrink-0" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
