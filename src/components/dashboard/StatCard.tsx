import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'danger';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const iconContainerClasses = cn(
    'flex h-12 w-12 items-center justify-center rounded-lg',
    {
      'bg-muted': variant === 'default',
      'bg-primary/10 text-primary': variant === 'primary',
      'bg-accent/10 text-accent': variant === 'accent',
      'bg-risk-medium/10 text-risk-medium': variant === 'warning',
      'bg-risk-high/10 text-risk-high': variant === 'danger',
    }
  );

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold font-serif tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                'text-sm font-medium',
                trend.positive ? 'text-risk-low' : 'text-risk-high'
              )}>
                {trend.positive ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={iconContainerClasses}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
