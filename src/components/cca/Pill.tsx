import { cn } from '@/lib/utils';

type PillTone = 'default' | 'active' | 'accent' | 'warn' | 'positive' | 'danger' | 'mono';

const TONE: Record<PillTone, string> = {
  default: 'border-line bg-bg-alt text-ink-soft',
  active: 'border-brand bg-brand/[0.08] text-brand',
  accent: 'border-brand bg-brand text-white',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  positive: 'border-positive/40 bg-positive/10 text-positive',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  mono: 'border-line bg-surface text-ink-soft font-mono',
};

type PillProps = {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
  /** Show a small leading bullet (used in client tab pills). */
  withDot?: boolean;
};

/**
 * Pill — small rounded tag used for statuses, categories, and tab indicators.
 */
export function Pill({ children, tone = 'default', className, withDot }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-[11px] font-medium leading-tight',
        TONE[tone],
        className,
      )}
    >
      {withDot && (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full', tone === 'accent' ? 'bg-white' : 'bg-brand')}
        />
      )}
      {children}
    </span>
  );
}
