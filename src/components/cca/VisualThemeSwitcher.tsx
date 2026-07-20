import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisualTheme, type VisualTheme } from '@/hooks/useVisualTheme';

type Props = {
  className?: string;
};

/**
 * VisualThemeSwitcher — 3-up radio grid para as direções Índigo / Ardósia / Ameixa.
 * Each option shows a colour swatch (canvas, sidebar, accent) + name + tagline.
 */
export function VisualThemeSwitcher({ className }: Props) {
  const { theme, setTheme, themes } = useVisualTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Direção visual"
      className={cn('grid gap-3 sm:grid-cols-3', className)}
    >
      {themes.map((opt) => {
        const selected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(opt.id as VisualTheme)}
            className={cn(
              'group relative flex flex-col gap-3 rounded-card border bg-surface p-4 text-left transition-colors',
              selected
                ? 'border-brand ring-2 ring-brand/30'
                : 'border-line hover:border-ink hover:bg-bg-alt',
            )}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
            )}

            {/* Swatch — preview of canvas/sidebar/accent */}
            <div className="flex h-14 w-full overflow-hidden rounded-control border border-line">
              <div className="w-1/4" style={{ background: opt.swatch.sidebar }} />
              <div className="w-1/2" style={{ background: opt.swatch.bg }} />
              <div className="w-1/4" style={{ background: opt.swatch.accent }} />
            </div>

            <div className="space-y-0.5">
              <p className="font-display text-[15px] font-medium leading-tight tracking-[-0.005em] text-ink">
                {opt.name}
              </p>
              <p className="text-[11.5px] leading-tight text-ink-mute">{opt.tagline}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
