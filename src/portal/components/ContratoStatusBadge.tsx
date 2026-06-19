import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { estadoMeta, ESTADO_TONE_CLASS } from '@/portal/lib/contrato';

/** Badge de estado do contrato, traduzido e com tom de cor coerente. */
export function ContratoStatusBadge({ estado }: { estado: string }) {
  const { t } = useTranslation();
  const meta = estadoMeta(estado);
  return (
    <Badge variant="outline" className={cn('text-xs', ESTADO_TONE_CLASS[meta.tone])}>
      {t(meta.i18nKey)}
    </Badge>
  );
}
