import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { Link } from 'react-router-dom';
import { CCACardHeader, Pill } from '@/components/cca';

interface RecentContractsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const STATUS_TONE: Record<
  string,
  'default' | 'active' | 'accent' | 'warn' | 'positive' | 'danger'
> = {
  rascunho: 'default',
  em_revisao: 'default',
  em_aprovacao: 'warn',
  enviado_para_assinatura: 'accent',
  activo: 'positive',
  expirado: 'danger',
  denunciado: 'warn',
  rescindido: 'danger',
};

const RecentContractsWidget = forwardRef<HTMLDivElement, RecentContractsWidgetProps>(
  function RecentContractsWidget({ title, config }, ref) {
    const { t } = useTranslation();
    const { contratos, isLoading } = useContratos();

    const limit = (config.limit as number) || 5;
    const showStatus = config.showStatus !== false;

    const statusLabels: Record<string, string> = {
      rascunho: t('status.draft'),
      em_revisao: t('status.inReview'),
      em_aprovacao: t('status.inApproval'),
      enviado_para_assinatura: t('status.sentForSignature'),
      activo: t('status.active'),
      expirado: t('status.expired'),
      denunciado: t('status.denounced'),
      rescindido: t('status.rescinded'),
    };

    const recentContracts = useMemo(
      () =>
        (contratos ?? [])
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit),
      [contratos, limit],
    );

    const viewAll = (
      <Link
        to="/contratos"
        className="inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[0.01em] text-brand hover:text-brand-strong"
      >
        {t('home.viewAll')}
        <ArrowRight className="h-3 w-3" />
      </Link>
    );

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CCACardHeader eyebrow="Contratos" title={title} />
          <div className="space-y-3 px-5 py-4">
            {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center justify-between">
                <div className="h-4 w-2/3 rounded bg-bg-alt" />
                <div className="h-5 w-16 rounded bg-bg-alt" />
              </div>
            ))}
          </div>
        </Card>
      );
    }

    // Sem contratos: ocultar o widget.
    if (!recentContracts?.length) {
      return null;
    }

    return (
      <Card ref={ref}>
        <CCACardHeader eyebrow="Contratos" title={title} action={viewAll} />
        <ul className="divide-y divide-line-soft">
          {recentContracts.map((contract) => (
            <li key={contract.id}>
              <Link
                to={`/contratos/${contract.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-alt"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[14px] font-medium leading-tight text-ink">
                    {contract.titulo_contrato}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink-mute">
                    {contract.parte_b_nome_legal}
                  </p>
                </div>
                {showStatus && (
                  <Pill
                    tone={STATUS_TONE[contract.estado_contrato] ?? 'default'}
                    className="shrink-0"
                  >
                    {statusLabels[contract.estado_contrato] || contract.estado_contrato}
                  </Pill>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    );
  },
);

export default RecentContractsWidget;
