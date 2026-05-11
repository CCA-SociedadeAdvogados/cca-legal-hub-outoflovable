import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow } from './Eyebrow';

type CardHeaderProps = {
  /** Small uppercase label rendered above the title (with the orange rule). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Slot rendered on the right (e.g. "Ver todos →" link). */
  action?: React.ReactNode;
  className?: string;
};

/**
 * CCACardHeader — handoff-style header used inside shadcn `<Card>`.
 * Layout: eyebrow + display-serif title on the left, optional action on the right,
 * separated from the body by a bottom border.
 */
export function CCACardHeader({ eyebrow, title, action, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="mb-1.5">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <h3 className="font-display text-[19px] font-medium leading-tight tracking-[-0.005em] text-ink">
          {title}
        </h3>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
