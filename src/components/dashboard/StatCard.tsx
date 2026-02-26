import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'danger';
}

export function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  const borderClass = {
    default: 'border-l-border',
    primary: 'border-l-primary',
    accent: 'border-l-accent',
    warning: 'border-l-risk-medium',
    danger: 'border-l-risk-high',
  }[variant];

  const iconBgClass = {
    default: 'bg-muted',
    primary: 'bg-primary/10',
    accent: 'bg-accent/10',
    warning: 'bg-risk-medium/10',
    danger: 'bg-risk-high/10',
  }[variant];

  return (
    <Card className={cn('border-l-4', borderClass)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none pt-0.5">
            {title}
          </p>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-base leading-none', iconBgClass)}>
            {icon}
          </span>
        </div>
        <p className="text-2xl font-bold font-serif tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-2', trend.positive ? 'text-risk-low' : 'text-risk-high')}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
