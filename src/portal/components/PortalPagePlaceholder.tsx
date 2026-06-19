import { Eyebrow } from '@/components/cca';
import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PortalPagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Itens que esta página vai conter quando estiver implementada. */
  upcoming?: string[];
}

/**
 * Esqueleto on-brand para as páginas do portal ainda por implementar.
 * Substituído por conteúdo real à medida que cada página é construída.
 */
export function PortalPagePlaceholder({
  eyebrow,
  title,
  description,
  upcoming,
}: PortalPagePlaceholderProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">{title}</h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">{description}</p>
      </header>

      <div className="rounded-control border border-dashed border-line bg-surface/50 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-bg-alt text-ink-mute">
            <Construction className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-[13px] font-medium text-ink">{t('portal.placeholder.title')}</p>
            {upcoming && upcoming.length > 0 && (
              <ul className="space-y-1.5 text-[12.5px] text-ink-mute">
                {upcoming.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
