import { useTranslation } from 'react-i18next';
import { FileText, Paperclip } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Contrato } from '@/hooks/useContratos';
import { ContratoStatusBadge } from './ContratoStatusBadge';
import { ContratoResumoExecutivo } from './ContratoResumoExecutivo';
import { formatCurrency, formatDate, getNextDeadline, tipoI18nKey } from '@/portal/lib/contrato';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">{label}</p>
      <p className="text-[13px] text-ink">{value}</p>
    </div>
  );
}

interface ContratoDetailDrawerProps {
  contrato: Contrato | null;
  open: boolean;
  onClose: () => void;
}

/** Vista de detalhe read-only do contrato para o cliente. Sem ações internas da CCA. */
export function ContratoDetailDrawer({ contrato, open, onClose }: ContratoDetailDrawerProps) {
  const { t, i18n } = useTranslation();

  if (!contrato) return null;

  const tipoKey = tipoI18nKey(contrato.tipo_contrato);
  const tipoLabel = tipoKey
    ? t(tipoKey)
    : (contrato.tipo_contrato_personalizado ?? contrato.tipo_contrato);
  const { kind, date, days } = getNextDeadline(contrato);
  const deadlineTone =
    days !== null && days <= 30
      ? 'text-danger'
      : days !== null && days <= 60
        ? 'text-warn'
        : 'text-ink';

  const deadlineText =
    kind && date
      ? `${t(kind === 'renewal' ? 'portal.contracts.renewalDecision' : 'portal.contracts.term')}: ${formatDate(
          date.toISOString(),
          i18n.language,
        )}${days !== null ? ` · ${t('portal.contracts.inDays', { count: days })}` : ''}`
      : t('portal.contracts.noDeadline');

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-mute" strokeWidth={1.5} />
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold leading-snug">
                {contrato.titulo_contrato}
              </SheetTitle>
              <p className="mt-0.5 text-sm text-ink-mute">{contrato.parte_b_nome_legal}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tipoLabel}
            </Badge>
            <ContratoStatusBadge estado={contrato.estado_contrato} />
          </div>
        </SheetHeader>

        <div className="space-y-5 py-5">
          <ContratoResumoExecutivo contratoId={contrato.id} />

          {contrato.objeto_resumido && (
            <Field label={t('portal.contracts.summary')} value={contrato.objeto_resumido} />
          )}

          <div>
            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">
              {t('portal.contracts.nextDeadline')}
            </p>
            <p className={cn('text-[13px] font-medium', deadlineTone)}>{deadlineText}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('portal.contracts.parties.a')} value={contrato.parte_a_nome_legal} />
            <Field label={t('portal.contracts.parties.b')} value={contrato.parte_b_nome_legal} />
            <Field
              label={t('portal.contracts.startDate')}
              value={formatDate(contrato.data_inicio_vigencia, i18n.language)}
            />
            <Field
              label={t('portal.contracts.endDate')}
              value={formatDate(contrato.data_termo, i18n.language)}
            />
            <Field
              label={t('portal.contracts.value')}
              value={
                contrato.valor_total_estimado !== null
                  ? formatCurrency(contrato.valor_total_estimado, i18n.language, contrato.moeda)
                  : null
              }
            />
            <Field label={t('portal.contracts.reference')} value={contrato.id_interno} />
          </div>

          {contrato.arquivo_nome_original && (
            <div className="flex items-center gap-2 rounded-control border border-line bg-bg-alt/50 px-3 py-2 text-[12.5px] text-ink-mute">
              <Paperclip className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="min-w-0 truncate">{contrato.arquivo_nome_original}</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
