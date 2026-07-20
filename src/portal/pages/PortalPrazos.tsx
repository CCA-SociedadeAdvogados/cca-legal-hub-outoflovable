import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Download,
  FileText,
  Gavel,
  ListChecks,
  Milestone,
  FolderOpen,
} from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  useHubClientPrazos,
  useHubPortalConfig,
  type HubClientPrazo,
  type HubTipoEvento,
} from '@/hooks/useHub';
import { downloadICS } from '@/lib/ics';
import { formatDate } from '@/portal/lib/contrato';

/**
 * Prazos e datas importantes (F5 do blueprint): a mesma base de eventos da
 * linha temporal, com a lente "futuro de todos os assuntos". O estado vem
 * calculado do servidor — vencidos aparecem em secção própria, a vermelho,
 * nunca misturados com os próximos.
 */

type Bucket = 'overdue' | 'next30' | 'next90' | 'later';
const BUCKET_ORDER: Bucket[] = ['overdue', 'next30', 'next90', 'later'];

function bucketOf(p: HubClientPrazo, days: number): Bucket {
  if (p.estado === 'vencido') return 'overdue';
  if (days <= 30) return 'next30';
  if (days <= 90) return 'next90';
  return 'later';
}

const TIPO_ICON: Record<HubTipoEvento, React.ElementType> = {
  marco_fase: Milestone,
  prazo_processual: ListChecks,
  audiencia: Gavel,
  data_contratual: FileText,
  marco_manual: Milestone,
  evento_documental: FolderOpen,
};

export default function PortalPrazos() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const { data: prazos = [], isLoading } = useHubClientPrazos();
  const { data: config } = useHubPortalConfig(currentOrganization?.id);

  const grouped = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const map: Record<Bucket, Array<HubClientPrazo & { days: number }>> = {
      overdue: [],
      next30: [],
      next90: [],
      later: [],
    };
    for (const p of prazos) {
      const date = new Date(p.data_evento);
      const days = Math.round((date.getTime() - hoje.getTime()) / 86400000);
      map[bucketOf(p, days)].push({ ...p, days });
    }
    return map;
  }, [prazos]);

  const total = BUCKET_ORDER.reduce((acc, b) => acc + grouped[b].length, 0);

  const daysLabel = (days: number) =>
    days < 0
      ? t('portal.deadlines.overdueDays', { count: Math.abs(days) })
      : days === 0
        ? t('portal.deadlines.today')
        : t('portal.deadlines.inDays', { count: days });

  const exportar = () =>
    downloadICS(
      prazos
        .filter((p) => p.estado !== 'vencido')
        .map((p) => ({
          id: p.evento_id,
          date: new Date(p.data_evento),
          title: p.titulo,
          description: p.assunto_titulo ?? undefined,
        })),
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Eyebrow>{t('portal.pages.deadlines.eyebrow')}</Eyebrow>
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
            {t('portal.pages.deadlines.title')}
          </h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
            {t('portal.pages.deadlines.description')}
          </p>
        </div>
        {config?.funcionalidades.ics && total > 0 && (
          <button
            type="button"
            onClick={exportar}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <Download className="h-3.5 w-3.5" />
            {t('portal.deadlines.exportIcs')}
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <CalendarClock className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.deadlines.empty')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((bucket) => (
            <section key={bucket} className="space-y-3">
              <h2
                className={cn(
                  'text-[11px] font-medium uppercase tracking-eyebrow',
                  bucket === 'overdue' ? 'text-danger' : 'text-ink-mute',
                )}
              >
                {t(`portal.deadlines.buckets.${bucket}`)}
                <span className="ml-2 font-mono text-ink-mute">{grouped[bucket].length}</span>
              </h2>
              <div className="space-y-2">
                {grouped[bucket].map((p) => {
                  const Icon = TIPO_ICON[p.tipo];
                  const tone =
                    p.estado === 'vencido'
                      ? 'text-danger'
                      : p.days <= 30
                        ? 'text-warn'
                        : 'text-ink-soft';
                  return (
                    <div
                      key={p.evento_id}
                      className={cn(
                        'flex items-center gap-3 rounded-control border bg-surface px-4 py-3',
                        p.estado === 'vencido' ? 'border-danger/40' : 'border-line',
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line bg-bg-alt text-ink-mute">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{p.titulo}</p>
                        <p className="truncate text-[12px] text-ink-mute">
                          {t(`hub.tipos.${p.tipo}`)}
                          {p.assunto_titulo ? ` · ${p.assunto_titulo}` : ''}
                        </p>
                        {p.requer_acao_cliente && (
                          <Badge
                            variant="outline"
                            className="mt-1 border-warn/40 bg-warn/10 text-[10px] text-warn"
                          >
                            {t('hub.acaoCliente')}
                          </Badge>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[12.5px] text-ink">
                          {formatDate(p.data_evento, i18n.language)}
                        </p>
                        <p className={cn('text-[11.5px] font-medium', tone)}>{daysLabel(p.days)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
