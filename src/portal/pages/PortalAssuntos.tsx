import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, ChevronDown, ChevronRight, Loader2, Circle } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAssuntos, type Assunto, type AssuntoEstado } from '@/hooks/useAssuntos';
import { useHubClientTimeline, type HubEstadoEvento } from '@/hooks/useHub';
import { formatDate } from '@/portal/lib/contrato';

/* Estado calculado no servidor (Secção 4.3 do blueprint): vencido nunca se
 * mistura com "próximos" nem com concluído. */
const EVENTO_ESTADO_TONE: Record<HubEstadoEvento, string> = {
  concluido: 'text-risk-low',
  em_curso: 'text-brand',
  previsto: 'text-ink-mute',
  vencido: 'text-danger',
};

const ESTADO_TONE: Record<AssuntoEstado, string> = {
  aberto: 'border-line bg-bg-alt text-ink-soft',
  em_curso: 'border-brand/30 bg-brand/[0.08] text-brand',
  aguarda_cliente: 'border-warn/40 bg-warn/10 text-warn',
  concluido: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
  suspenso: 'border-line bg-bg-alt text-ink-mute',
};

export default function PortalAssuntos() {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const { assuntos, isLoading } = useAssuntos(currentOrganization?.id);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('assunto');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.matters.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.matters.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.matters.description')}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : assuntos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <Briefcase className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.matters.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assuntos.map((a) => (
            <AssuntoCard key={a.id} assunto={a} highlight={a.id === highlightId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssuntoCard({ assunto, highlight = false }: { assunto: Assunto; highlight?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(highlight);
  const { data: eventos = [], isLoading } = useHubClientTimeline(open ? assunto.id : null);
  const estado = (assunto.estado as AssuntoEstado) ?? 'aberto';
  const ref = useRef<HTMLElement>(null);

  // Quando referenciado por ?assunto=<id>, abre a timeline e faz scroll até ao cartão.
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  return (
    <article
      ref={ref}
      className={cn(
        'rounded-card border border-line bg-surface p-5 transition-shadow',
        highlight && 'ring-2 ring-brand/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-medium leading-snug text-ink">
            {assunto.titulo}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">
            {t(`portal.matters.tipos.${assunto.tipo}`)}
            {assunto.referencia ? ` · ${assunto.referencia}` : ''} · {t('portal.matters.opened')}{' '}
            {formatDate(assunto.data_abertura, i18n.language)}
          </p>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-xs', ESTADO_TONE[estado])}>
          {t(`portal.matters.estados.${estado}`)}
        </Badge>
      </div>

      {assunto.descricao && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{assunto.descricao}</p>
      )}

      {/* F2: ponto de situação curado pela equipa CCA */}
      {assunto.status_cliente && (
        <p className="mt-2 rounded-control border border-brand/20 bg-brand/[0.05] px-3 py-2 text-[13px] leading-relaxed text-ink">
          {assunto.status_cliente}
        </p>
      )}

      {assunto.data_prevista_conclusao && estado !== 'concluido' && (
        <p className="mt-2 text-[12px] text-ink-mute">
          {t('portal.matters.expected')}:{' '}
          {formatDate(assunto.data_prevista_conclusao, i18n.language)}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand transition-colors hover:text-brand/80"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {t('portal.matters.timeline')}
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-ink-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-[12.5px] text-ink-mute">{t('portal.matters.noUpdates')}</p>
          ) : (
            <ol className="space-y-3">
              {eventos.map((e) => (
                <li key={e.evento_id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Circle
                      className={cn(
                        'mt-1 h-2.5 w-2.5',
                        e.estado === 'vencido'
                          ? 'fill-danger text-danger'
                          : 'fill-brand text-brand',
                      )}
                    />
                    <span className="mt-1 w-px flex-1 bg-line" />
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-[11px] font-mono text-ink-mute">
                      {formatDate(e.data_evento, i18n.language)}
                      <span
                        className={cn('ml-2 font-sans font-medium', EVENTO_ESTADO_TONE[e.estado])}
                      >
                        {t(`hub.estados.${e.estado}`)}
                      </span>
                    </p>
                    <p className="text-[13px] font-medium text-ink">{e.titulo}</p>
                    {e.requer_acao_cliente && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-warn/40 bg-warn/10 text-[10px] text-warn"
                      >
                        {t('hub.acaoCliente')}
                      </Badge>
                    )}
                    {e.descricao && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
                        {e.descricao}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}
