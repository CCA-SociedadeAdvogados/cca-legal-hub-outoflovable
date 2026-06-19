import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCCANews, type CCANews } from '@/hooks/useCCANews';
import { useEffectiveIndustrySectors } from '@/hooks/useEffectiveIndustrySectors';
import { getSectorLabel } from '@/lib/industrySectors';
import { formatDate } from '@/portal/lib/contrato';

export default function PortalNovidades() {
  const { t, i18n } = useTranslation();
  const { news, isLoading } = useCCANews();
  const { sectors: clientSectors, isLoading: isLoadingSectors } = useEffectiveIndustrySectors();
  const [selected, setSelected] = useState<CCANews | null>(null);

  const dateOf = (n: CCANews) => n.data_publicacao ?? n.created_at;

  // Geral (sem setor) + novidades cujo setor cruza com o(s) setor(es) do cliente
  const visibleNews = useMemo(() => {
    return news.filter((n) => {
      const newsSectors = n.sectors ?? [];
      if (newsSectors.length === 0) return true; // geral
      return newsSectors.some((s) => clientSectors.includes(s));
    });
  }, [news, clientSectors]);

  const loading = isLoading || isLoadingSectors;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.news.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.news.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.news.description')}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : visibleNews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <Newspaper className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.news.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNews.map((n) => {
            const newsSectors = n.sectors ?? [];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(n)}
                className="block w-full rounded-card border border-line bg-surface px-5 py-4 text-left transition-colors hover:bg-bg-alt"
              >
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] text-ink-mute">
                    {formatDate(dateOf(n), i18n.language)}
                  </p>
                  {newsSectors.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-brand/30 bg-brand/[0.06] text-[10px] text-brand"
                    >
                      {getSectorLabel(s)}
                    </Badge>
                  ))}
                </div>
                <h2 className="mt-1 font-display text-[16px] font-medium leading-snug text-ink">
                  {n.titulo}
                </h2>
                {n.resumo && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-mute">
                    {n.resumo}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[11px] text-ink-mute">
                    {formatDate(dateOf(selected), i18n.language)}
                  </p>
                  {(selected.sectors ?? []).map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-brand/30 bg-brand/[0.06] text-[10px] text-brand"
                    >
                      {getSectorLabel(s)}
                    </Badge>
                  ))}
                </div>
                <SheetTitle className="text-lg font-semibold leading-snug">
                  {selected.titulo}
                </SheetTitle>
              </SheetHeader>
              <div className="py-5">
                {selected.resumo && (
                  <p className="mb-4 text-[14px] font-medium leading-relaxed text-ink">
                    {selected.resumo}
                  </p>
                )}
                <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
                  {selected.conteudo}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
