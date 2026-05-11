import { cn } from '@/lib/utils';

type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
  /** Hide the leading orange filete (line) before the label. */
  hideRule?: boolean;
  /** Use a tighter letter-spacing (0.18em) instead of default 0.22em. */
  tight?: boolean;
};

/**
 * Eyebrow — small uppercase label with a leading orange rule (filete).
 * Used above page H1s, card titles, and section headers.
 */
export function Eyebrow({ children, className, hideRule, tight }: EyebrowProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[10.5px] font-medium uppercase leading-none text-ink-mute',
        tight ? 'tracking-eyebrow-tight' : 'tracking-eyebrow',
        className,
      )}
    >
      {!hideRule && <span aria-hidden className="h-px w-[18px] bg-brand" />}
      {children}
    </span>
  );
}
