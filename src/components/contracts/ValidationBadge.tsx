import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertTriangle, XCircle, Loader2, HelpCircle } from 'lucide-react';

export type ValidationStatusType =
  | 'none'
  | 'draft_only'
  | 'validating'
  | 'validated'
  | 'needs_review'
  | 'failed';
// Note: 'validating' is kept in the type for backwards compatibility with existing DB records

interface ValidationBadgeProps {
  status: ValidationStatusType;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  ValidationStatusType,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
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
    label: 'Provisório',
    compactLabel: 'Provisório',
    variant: 'outline',
    className: 'border-amber-400 text-amber-700 bg-amber-50',
  },
  validating: {
    icon: Loader2,
    label: 'A validar...',
    compactLabel: 'Validando...',
    variant: 'outline',
    className: 'border-blue-400 text-blue-700 bg-blue-50',
  },
  validated: {
    icon: ShieldCheck,
    label: 'Validado',
    compactLabel: 'Validado',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  needs_review: {
    icon: AlertTriangle,
    label: 'Requer validação interna',
    compactLabel: 'Revisão',
    variant: 'outline',
    className: 'border-orange-400 text-orange-700 bg-orange-50',
  },
  failed: {
    icon: XCircle,
    label: 'Falha na validação',
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
