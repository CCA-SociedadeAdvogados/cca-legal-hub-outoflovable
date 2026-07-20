import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Skeleton } from '@/components/ui/skeleton';
import { useTlClientInstances, type TlClientInstance } from '@/hooks/useTimelines';
import { ClientTimeline } from '@/components/timelines/ClientTimeline';

/**
 * Timelines de processos — vista do cliente (portal).
 * Lista os casos da organização via rpc tl_client_instances e mostra o
 * stepper read-only (ClientTimeline). Nenhum dado de prazo/data chega aqui:
 * os RPCs do caminho do cliente não devolvem essas colunas.
 */
export default function PortalTimelines() {
  const { t } = useTranslation();
  const { data: instances = [], isLoading } = useTlClientInstances();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.timelines.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.timelines.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.timelines.description')}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <ListChecks className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.timelines.emptyList')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <TimelineCard key={instance.instance_id} instance={instance} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ instance }: { instance: TlClientInstance }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-medium leading-snug text-ink">
            {instance.matter_ref || instance.template_title}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">{instance.template_title}</p>
        </div>
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" />
        )}
      </button>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <ClientTimeline instanceId={instance.instance_id} />
        </div>
      )}
    </article>
  );
}
