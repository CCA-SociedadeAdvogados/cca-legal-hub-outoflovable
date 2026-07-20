import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useLawyerTimeline,
  useSetTlPhase,
  type TlEstado,
  type TlLawyerPhase,
  type TlTipo,
} from '@/hooks/useTimelines';

const TIPO_TONE: Record<TlTipo, string> = {
  gatilho: 'bg-primary/15 text-primary',
  prazo_parte: 'bg-risk-medium/20 text-risk-medium',
  prazo_tribunal: 'bg-muted text-muted-foreground',
  marco: 'bg-risk-low/20 text-risk-low',
};

/** Próximo estado no ciclo do toggle: pendente → ativa → concluída → pendente. */
const NEXT_ESTADO: Record<TlEstado, TlEstado> = {
  pendente: 'ativa',
  ativa: 'concluida',
  concluida: 'pendente',
};

function EstadoIcon({ estado }: { estado: TlEstado }) {
  if (estado === 'concluida')
    return <CheckCircle2 className="h-5 w-5 text-risk-low" strokeWidth={2} />;
  if (estado === 'ativa') return <CircleDot className="h-5 w-5 text-primary" strokeWidth={2} />;
  return <Circle className="h-5 w-5 text-muted-foreground/50" strokeWidth={2} />;
}

/**
 * Timeline do advogado (papéis CCA): vista completa via rpc tl_lawyer_timeline,
 * com prazo calculado, base legal, flag ⚠️ de validação e notas internas.
 * O toggle por fase muta via rpc tl_set_phase (SECURITY DEFINER, só advogado).
 */
export function LawyerTimeline({ instanceId }: { instanceId: string }) {
  const { t, i18n } = useTranslation();
  const { data: phases = [], isLoading } = useLawyerTimeline(instanceId);
  const setPhase = useSetTlPhase(instanceId);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'pt-PT') : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (phases.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t('timelines.empty')}</p>;
  }

  return (
    <ol className="space-y-0">
      {phases.map((phase, idx) => (
        <LawyerPhaseRow
          key={phase.instance_phase_id}
          phase={phase}
          isLast={idx === phases.length - 1}
          formatDate={formatDate}
          onToggle={() =>
            setPhase.mutate({
              instancePhaseId: phase.instance_phase_id,
              estado: NEXT_ESTADO[phase.estado],
            })
          }
          isPending={setPhase.isPending}
        />
      ))}
    </ol>
  );
}

function LawyerPhaseRow({
  phase,
  isLast,
  formatDate,
  onToggle,
  isPending,
}: {
  phase: TlLawyerPhase;
  isLast: boolean;
  formatDate: (iso: string | null) => string | null;
  onToggle: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <EstadoIcon estado={phase.estado} />
        {!isLast && <span className="my-1 w-px flex-1 bg-border" />}
      </div>

      <div className={cn('min-w-0 flex-1', !isLast && 'pb-5')}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              phase.estado === 'pendente' ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {phase.ordem}. {phase.label}
          </span>
          <Badge variant="secondary" className={cn('text-[10px]', TIPO_TONE[phase.tipo])}>
            {t(`timelines.tipos.${phase.tipo}`)}
          </Badge>
          {phase.is_optional && (
            <Badge variant="outline" className="text-[10px]">
              {t('timelines.optional')}
            </Badge>
          )}
          {phase.confirmar && (
            <Badge
              variant="outline"
              className="gap-1 border-risk-medium/40 text-[10px] text-risk-medium"
              title={t('timelines.confirmarHint')}
            >
              <AlertTriangle className="h-3 w-3" />
              {t('timelines.confirmar')}
            </Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {phase.base_legal && <span>{phase.base_legal}</span>}
          {phase.prazo_calculado && (
            <span className="font-medium text-risk-medium">
              {t('timelines.deadline')}: {formatDate(phase.prazo_calculado)}
            </span>
          )}
          {phase.data_conclusao && (
            <span>
              {t('timelines.completedOn')}: {formatDate(phase.data_conclusao)}
            </span>
          )}
        </div>

        {phase.notas && (
          <p className="mt-1 text-xs italic leading-relaxed text-muted-foreground">{phase.notas}</p>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 text-xs"
        disabled={isPending}
        onClick={onToggle}
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {t(`timelines.toggleTo.${NEXT_ESTADO[phase.estado]}`)}
      </Button>
    </li>
  );
}
