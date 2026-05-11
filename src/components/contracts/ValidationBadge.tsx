import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle, XCircle, Loader2, HelpCircle } from 'lucide-react';

export type ValidationStatusType =
  | 'none'
  | 'draft_only'
  | 'validating'
  | 'validated'
  | 'needs_review'
  | 'failed';

interface ValidationBadgeProps {
  status: ValidationStatusType;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  ValidationStatusType,
  {
    icon: LucideIcon;
    label: string;
    compactLabel: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  none: {
    icon: HelpCircle,
    label: 'Sem extracção',
    compactLabel: 'N/A',
    variant: 'secondary',
    className: '',
  },
  draft_only: {
    icon: Clock,
    label: 'Provisório (em validação pelo CCA)',
    compactLabel: 'Provisório',
    variant: 'outline',
    className: 'border-warn/40 text-warn bg-warn/10',
  },
  validating: {
    icon: Loader2,
    label: 'A validar pelo CCA...',
    compactLabel: 'Validando...',
    variant: 'outline',
    className: 'border-brand/40 text-brand bg-brand/[0.08]',
  },
  validated: {
    icon: ShieldCheck,
    label: 'Validado pelo CCA',
    compactLabel: 'Validado',
    variant: 'default',
    className: 'bg-positive hover:bg-positive/90 text-white border-positive',
  },
  needs_review: {
    icon: AlertTriangle,
    label: 'Requer validação interna',
    compactLabel: 'Revisão',
    variant: 'outline',
    className: 'border-warn/40 text-warn bg-warn/10',
  },
  failed: {
    icon: XCircle,
    label: 'Falha na validação CCA',
    compactLabel: 'Falha',
    variant: 'destructive',
    className: '',
  },
};

export function ValidationBadge({ status, compact = false, className = '' }: ValidationBadgeProps) {
  const config = statusConfig[status] || statusConfig.none;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${config.className} ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'validating' ? 'animate-spin' : ''}`} />
      {compact ? config.compactLabel : config.label}
    </Badge>
  );
}
