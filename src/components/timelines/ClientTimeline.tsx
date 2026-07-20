import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleDot } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientTimeline } from '@/hooks/useTimelines';

/**
 * Timeline do cliente (papéis org): stepper read-only via rpc tl_client_timeline.
 * Apenas label + estado (ativa/concluída). SEM datas, SEM prazos, SEM base legal —
 * garantido no servidor: o RPC não devolve nenhuma coluna de prazo/data, e este
 * componente não renderiza nada além de `label` e `estado`.
 */
export function ClientTimeline({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation();
  const { data: phases = [], isLoading } = useClientTimeline(instanceId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (phases.length === 0) {
    return <p className="py-4 text-[12.5px] text-ink-mute">{t('portal.timelines.empty')}</p>;
  }

  return (
    <ol className="space-y-0">
      {phases.map((phase, idx) => {
        const concluida = phase.estado === 'concluida';
        const isLast = idx === phases.length - 1;
        return (
          <li key={phase.ordem} className="flex gap-3">
            <div className="flex flex-col items-center">
              {concluida ? (
                <CheckCircle2 className="h-[18px] w-[18px] text-risk-low" />
              ) : (
                <CircleDot className="h-[18px] w-[18px] text-brand" />
              )}
              {!isLast && <span className="my-1 w-px flex-1 bg-line" />}
            </div>
            <div className={cn('min-w-0', !isLast && 'pb-4')}>
              <p
                className={cn(
                  'text-[13px] font-medium leading-snug',
                  concluida ? 'text-ink-soft' : 'text-ink',
                )}
              >
                {phase.label}
              </p>
              <p className="text-[11px] text-ink-mute">
                {t(`portal.timelines.estados.${phase.estado}`)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
