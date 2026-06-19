import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, AlertTriangle, CalendarClock, ArrowRight, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/** Forma do resumo executivo devolvido pela edge function executive-summary. */
interface ExecutiveSummaryData {
  o_que_e: string;
  partes: string;
  o_que_importa: string[];
  datas_importantes: string[];
  valor: string | null;
  proxima_acao: string | null;
  alertas: string[];
}

interface Props {
  contratoId: string;
}

/**
 * Resumo executivo 1-clique para o cliente. Lê o resumo em cache
 * (contract_extractions, source=executive_summary — scopado por org via RLS) e,
 * se não existir, gera-o com um clique através da edge function executive-summary.
 */
export function ContratoResumoExecutivo({ contratoId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.executiveSummary.byContract(contratoId),
    enabled: !!contratoId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ExecutiveSummaryData | null> => {
      const { data, error } = await supabase
        .from('contract_extractions')
        .select('extraction_data')
        .eq('contrato_id', contratoId)
        .eq('source', 'executive_summary')
        .maybeSingle();
      if (error) throw error;
      return (data?.extraction_data as unknown as ExecutiveSummaryData) ?? null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('executive-summary', {
        body: { contract_id: contratoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data as ExecutiveSummaryData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.executiveSummary.byContract(contratoId), data);
    },
    onError: (e: Error) => {
      toast({
        title: t('portal.summary.error'),
        description: e.message,
        variant: 'destructive',
      });
    },
  });

  const isBusy = isLoading || generate.isPending;

  if (isBusy && !summary) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-line bg-bg-alt/40 px-4 py-3 text-[12.5px] text-ink-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
        {generate.isPending ? t('portal.summary.generating') : t('portal.summary.loading')}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-card border border-dashed border-line bg-bg-alt/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand/[0.08] text-brand">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink">{t('portal.summary.ctaTitle')}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">
              {t('portal.summary.ctaBody')}
            </p>
            <button
              type="button"
              onClick={() => generate.mutate()}
              className="mt-3 inline-flex items-center gap-2 rounded-control bg-brand px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-brand/90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('portal.summary.generate')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" strokeWidth={1.5} />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
          {t('portal.summary.heading')}
        </p>
      </div>

      <p className="text-[13.5px] leading-relaxed text-ink">{summary.o_que_e}</p>
      {summary.partes && (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{summary.partes}</p>
      )}

      {summary.o_que_importa?.length > 0 && (
        <Block title={t('portal.summary.keyPoints')}>
          <ul className="space-y-1.5">
            {summary.o_que_importa.map((p, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary.datas_importantes?.length > 0 && (
        <Block
          title={t('portal.summary.keyDates')}
          icon={<CalendarClock className="h-3.5 w-3.5" />}
        >
          <ul className="space-y-1">
            {summary.datas_importantes.map((d, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed text-ink-soft">
                {d}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary.valor && (
        <Block title={t('portal.summary.value')} icon={<Coins className="h-3.5 w-3.5" />}>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">{summary.valor}</p>
        </Block>
      )}

      {summary.proxima_acao && (
        <div className="flex items-start gap-2 rounded-control border border-brand/30 bg-brand/[0.06] px-3 py-2.5">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
              {t('portal.summary.nextAction')}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">{summary.proxima_acao}</p>
          </div>
        </div>
      )}

      {summary.alertas?.length > 0 && (
        <div className="space-y-1.5 rounded-control border border-warn/30 bg-warn/[0.07] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-warn">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
            <p className="text-[11px] font-medium uppercase tracking-wide">
              {t('portal.summary.alerts')}
            </p>
          </div>
          <ul className="space-y-1">
            {summary.alertas.map((a, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed text-ink-soft">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10.5px] leading-relaxed text-ink-mute">
        {t('portal.summary.disclaimer')}
      </p>
    </div>
  );
}

function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={cn(
          'mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-mute',
        )}
      >
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
