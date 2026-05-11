import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

const baseClasses =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 h-9 text-[12.5px] font-medium tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

/**
 * GoldButton — primary CTA filled with the CCA brand accent.
 * (Named "Gold" in the handoff for the luxe accent role; renders in laranja CCA.)
 */
export const GoldButton = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          baseClasses,
          'bg-brand text-white shadow-[0_1px_0_0_hsl(var(--accent-brand-strong))] hover:bg-brand-strong active:bg-brand-strong',
          className,
        )}
        {...props}
      />
    );
  },
);
GoldButton.displayName = 'GoldButton';

/**
 * GhostButton — outline secondary CTA.
 */
export const GhostButton = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          baseClasses,
          'border border-line bg-transparent text-ink hover:border-ink hover:bg-bg-alt',
          className,
        )}
        {...props}
      />
    );
  },
);
GhostButton.displayName = 'GhostButton';
