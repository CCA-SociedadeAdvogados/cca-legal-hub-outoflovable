import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, ExternalLink, FileText } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useImpactos } from '@/hooks/useImpactos';
import { formatDate } from '@/portal/lib/contrato';

const RISK_ORDER: Record<string, number> = { critico: 0, alto: 1, medio: 2, baixo: 3 };

const RISK_META: Record<string, { i18nKey: string; tone: string }> = {
  critico: { i18nKey: 'risk.critical', tone: 'border-danger/40 bg-danger/10 text-danger' },
  alto: { i18nKey: 'risk.high', tone: 'border-danger/40 bg-danger/10 text-danger' },
  medio: { i18nKey: 'risk.medium', tone: 'border-warn/40 bg-warn/10 text-warn' },
  baixo: { i18nKey: 'risk.low', tone: 'border-line bg-bg-alt text-ink-soft' },
};

export default function PortalImpactos() {
  const { t, i18n } = useTranslation();
  const { impactos, isLoading } = useImpactos();

  const ordered = useMemo(
    () =>
      [...(impactos ?? [])].sort(
        (a, b) => (RISK_ORDER[a.nivel_risco] ?? 9) - (RISK_ORDER[b.nivel_risco] ?? 9),
      ),
    [impactos],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.radar.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.radar.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.radar.description')}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <Scale className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.radar.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((imp) => {
            const risk = RISK_META[imp.nivel_risco] ?? RISK_META.baixo;
            const evento = imp.eventos_legislativos;
            const contrato = imp.contratos;
            return (
              <article key={imp.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-medium leading-snug text-ink">
                      {evento?.titulo ?? t('portal.radar.unknownEvent')}
                    </h2>
                    {evento?.referencia_legal && (
                      <p className="mt-0.5 font-mono text-[11.5px] text-ink-mute">
                        {evento.referencia_legal}
                        {evento.data_entrada_vigor &&
                          ` · ${t('portal.radar.inForce')} ${formatDate(evento.data_entrada_vigor, i18n.language)}`}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-xs', risk.tone)}>
                    {t(risk.i18nKey)}
                  </Badge>
                </div>

                {imp.descricao && (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{imp.descricao}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-mute">
                  {contrato?.titulo_contrato && (
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t('portal.radar.affectsContract')}: {contrato.titulo_contrato}
                    </span>
                  )}
                  {evento?.link_oficial && (
                    <a
                      href={evento.link_oficial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand transition-colors hover:text-brand/80"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('portal.radar.officialSource')}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
