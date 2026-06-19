import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, RefreshCw, FileX, BellRing } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useContratos } from '@/hooks/useContratos';
import { formatDate, getContratoDeadlines, type DeadlineKind } from '@/portal/lib/contrato';

interface DeadlineItem {
  contratoId: string;
  titulo: string;
  kind: DeadlineKind;
  date: Date;
  days: number;
}

type Bucket = 'overdue' | 'next30' | 'next90' | 'later';

const BUCKET_ORDER: Bucket[] = ['overdue', 'next30', 'next90', 'later'];

function bucketOf(days: number): Bucket {
  if (days < 0) return 'overdue';
  if (days <= 30) return 'next30';
  if (days <= 90) return 'next90';
  return 'later';
}

const KIND_ICON: Record<DeadlineKind, React.ElementType> = {
  renewal: RefreshCw,
  term: FileX,
  notice: BellRing,
};

export default function PortalPrazos() {
  const { t, i18n } = useTranslation();
  const { contratos, isLoading } = useContratos();

  const grouped = useMemo(() => {
    const items: DeadlineItem[] = [];
    for (const c of contratos ?? []) {
      for (const d of getContratoDeadlines(c)) {
        items.push({ contratoId: c.id, titulo: c.titulo_contrato, ...d });
      }
    }
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    const map: Record<Bucket, DeadlineItem[]> = {
      overdue: [],
      next30: [],
      next90: [],
      later: [],
    };
    for (const it of items) map[bucketOf(it.days)].push(it);
    return map;
  }, [contratos]);

  const total = BUCKET_ORDER.reduce((acc, b) => acc + grouped[b].length, 0);

  const kindLabel = (kind: DeadlineKind) =>
    t(
      kind === 'renewal'
        ? 'portal.deadlines.kinds.renewal'
        : kind === 'term'
          ? 'portal.deadlines.kinds.term'
          : 'portal.deadlines.kinds.notice',
    );

  const daysLabel = (days: number) =>
    days < 0
      ? t('portal.deadlines.overdueDays', { count: Math.abs(days) })
      : days === 0
        ? t('portal.deadlines.today')
        : t('portal.deadlines.inDays', { count: days });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.deadlines.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.deadlines.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.deadlines.description')}
        </p>
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
                {grouped[bucket].map((it, idx) => {
                  const Icon = KIND_ICON[it.kind];
                  const tone =
                    it.days < 0 ? 'text-danger' : it.days <= 30 ? 'text-warn' : 'text-ink-soft';
                  return (
                    <div
                      key={`${it.contratoId}-${it.kind}-${idx}`}
                      className="flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line bg-bg-alt text-ink-mute">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{it.titulo}</p>
                        <p className="text-[12px] text-ink-mute">{kindLabel(it.kind)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[12.5px] text-ink">
                          {formatDate(it.date.toISOString(), i18n.language)}
                        </p>
                        <p className={cn('text-[11.5px] font-medium', tone)}>
                          {daysLabel(it.days)}
                        </p>
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
