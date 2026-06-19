import { useTranslation } from 'react-i18next';
import { Wallet, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Eyebrow, KPI } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useFinanceiro, type AccountStatus } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate } from '@/portal/lib/contrato';

const STATUS_META: Record<
  AccountStatus,
  { icon: React.ElementType; tone: string; trend: 'up' | 'warn' | 'down' }
> = {
  em_dia: {
    icon: CheckCircle2,
    tone: 'border-positive/40 bg-positive/10 text-positive',
    trend: 'up',
  },
  em_aberto: { icon: AlertTriangle, tone: 'border-warn/40 bg-warn/10 text-warn', trend: 'warn' },
  em_incumprimento: {
    icon: AlertCircle,
    tone: 'border-danger/40 bg-danger/10 text-danger',
    trend: 'down',
  },
};

export default function PortalFinanceiro() {
  const { t, i18n } = useTranslation();
  const { accountSummary, financialItems, organizationInfo, isLoading, isLoadingNav } =
    useFinanceiro();
  const lang = i18n.language;

  const status = accountSummary.status;
  const statusMeta = STATUS_META[status];
  const StatusIcon = statusMeta.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.financial.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.financial.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.financial.description')}
        </p>
      </header>

      {/* Estado da conta */}
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-control" />
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 rounded-control border px-4 py-3 text-[13px] font-medium',
            statusMeta.tone,
          )}
        >
          <StatusIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          <span>{t(`portal.financial.status.${status}`)}</span>
        </div>
      )}

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KPI
            label={t('portal.financial.kpi.outstanding')}
            value={formatCurrency(accountSummary.totalEmAberto, lang)}
            trend={statusMeta.trend}
          />
          <KPI
            label={t('portal.financial.kpi.dueSoon')}
            value={accountSummary.faturasEmAberto}
            delta={
              accountSummary.proximoVencimento
                ? formatDate(accountSummary.proximoVencimento.toISOString(), lang)
                : undefined
            }
          />
          <KPI
            label={t('portal.financial.kpi.overdue')}
            value={accountSummary.faturasVencidas}
            trend={accountSummary.faturasVencidas > 0 ? 'down' : 'flat'}
          />
        </div>
      )}

      {/* Documentos / conta corrente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
            {t('portal.financial.documents')}
          </h2>
          {organizationInfo?.ultima_sincronizacao && (
            <span className="font-mono text-[11px] text-ink-mute">
              {t('portal.financial.lastSync')}:{' '}
              {formatDate(organizationInfo.ultima_sincronizacao, lang)}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-line">
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-alt/40">
                <TableHead>{t('portal.financial.columns.document')}</TableHead>
                <TableHead>{t('portal.financial.columns.description')}</TableHead>
                <TableHead>{t('portal.financial.columns.dueDate')}</TableHead>
                <TableHead>{t('portal.financial.columns.status')}</TableHead>
                <TableHead className="text-right">{t('portal.financial.columns.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingNav ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : financialItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-mute">
                      <Wallet className="h-6 w-6" strokeWidth={1.5} />
                      <span className="text-[13px]">{t('portal.financial.empty')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                financialItems.map((item, index) => (
                  <TableRow key={`${item.numero_documento ?? 'doc'}-${index}`}>
                    <TableCell className="py-3 font-mono text-[12.5px] text-ink">
                      {item.numero_documento ?? '—'}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-ink">
                      {item.descricao ?? '—'}
                    </TableCell>
                    <TableCell className="py-3 text-[12.5px] text-ink-soft">
                      {formatDate(item.data_vencimento, lang) ?? '—'}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          item.estado === 'vencido'
                            ? 'border-danger/40 bg-danger/10 text-danger'
                            : 'border-warn/40 bg-warn/10 text-warn',
                        )}
                      >
                        {t(`portal.financial.itemStatus.${item.estado}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-sm text-ink">
                      {formatCurrency(item.valor, lang)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
