import { cn } from '@/lib/utils';
import { Pill } from './Pill';

type Trend = 'up' | 'down' | 'warn' | 'flat';

type KPIProps = {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  trend?: Trend;
  className?: string;
};

const TREND_TONE: Record<Trend, 'positive' | 'warn' | 'danger' | 'default'> = {
  up: 'positive',
  down: 'danger',
  warn: 'warn',
  flat: 'default',
};

/**
 * KPI — display-serif numeric card with eyebrow label and optional delta pill.
 * Matches the dashboard KPI row in the handoff.
 */
export function KPI({ label, value, delta, trend = 'flat', className }: KPIProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-line bg-surface px-5 py-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10.5px] font-medium uppercase tracking-eyebrow text-ink-mute">
          {label}
        </span>
        {delta !== undefined && delta !== null && delta !== '' && (
          <Pill tone={TREND_TONE[trend]} className="shrink-0">
            {delta}
          </Pill>
        )}
      </div>
      <div className="font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
        {value}
      </div>
    </div>
  );
}
