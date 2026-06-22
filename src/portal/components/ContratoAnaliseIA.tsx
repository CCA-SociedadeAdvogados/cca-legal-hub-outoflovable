import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Loader2, ListChecks, CircleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RiskFactor {
  clausula: string;
  nivel: 'alto' | 'medio' | 'baixo' | string;
  nota: string;
}
interface Obligation {
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
}
interface ClientAnalysis {
  risco: { grau: string; resumo: string; fatores: RiskFactor[] };
  obrigacoes: Obligation[];
}

/** Cor do grau de risco A–F. */
const GRADE_TONE: Record<string, string> = {
  A: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
  B: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
  C: 'border-warn/40 bg-warn/10 text-warn',
  D: 'border-warn/50 bg-warn/15 text-warn',
  F: 'border-danger/40 bg-danger/10 text-danger',
};

const LEVEL_TONE: Record<string, string> = {
  alto: 'text-danger',
  medio: 'text-warn',
  baixo: 'text-ink-mute',
};

interface Props {
  contratoId: string;
}

/**
 * Análise IA do contrato para o cliente: radar de obrigações + score de risco
 * (A–F). Lê o resultado em cache (contract_extractions, source=client_analysis)
 * e gera-o com um clique via edge function analyze-contract-client.
 */
export function ContratoAnaliseIA({ contratoId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: queryKeys.clientAnalysis.byContract(contratoId),
    enabled: !!contratoId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ClientAnalysis | null> => {
      const { data, error } = await supabase
        .from('contract_extractions')
        .select('extraction_data')
        .eq('contrato_id', contratoId)
        .eq('source', 'client_analysis')
        .maybeSingle();
      if (error) throw error;
      return (data?.extraction_data as unknown as ClientAnalysis) ?? null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-contract-client', {
        body: { contract_id: contratoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data as ClientAnalysis;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.clientAnalysis.byContract(contratoId), data);
    },
    onError: (e: Error) => {
      toast({ title: t('portal.analysis.error'), description: e.message, variant: 'destructive' });
    },
  });

  const busy = isLoading || generate.isPending;

  if (busy && !analysis) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-line bg-bg-alt/40 px-4 py-3 text-[12.5px] text-ink-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
        {generate.isPending ? t('portal.analysis.generating') : t('portal.analysis.loading')}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-card border border-dashed border-line bg-bg-alt/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand/[0.08] text-brand">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink">{t('portal.analysis.ctaTitle')}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">
              {t('portal.analysis.ctaBody')}
            </p>
            <button
              type="button"
              onClick={() => generate.mutate()}
              className="mt-3 inline-flex items-center gap-2 rounded-control bg-brand px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-brand/90"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {t('portal.analysis.generate')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const grade = (analysis.risco?.grau ?? '').toUpperCase().slice(0, 1);
  const gradeTone = GRADE_TONE[grade] ?? 'border-line bg-bg-alt text-ink-soft';

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-4">
      {/* Risco */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-control border text-lg font-semibold',
            gradeTone,
          )}
          aria-label={t('portal.analysis.riskGrade')}
        >
          {grade || '—'}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
            {t('portal.analysis.risk')}
          </p>
          {analysis.risco?.resumo && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{analysis.risco.resumo}</p>
          )}
        </div>
      </div>

      {analysis.risco?.fatores?.length > 0 && (
        <ul className="space-y-1.5">
          {analysis.risco.fatores.map((f, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed">
              <CircleAlert
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  LEVEL_TONE[f.nivel] ?? 'text-ink-mute',
                )}
                strokeWidth={2}
              />
              <span className="text-ink-soft">
                <span className="font-medium text-ink">{f.clausula}</span>
                {f.nota ? ` — ${f.nota}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Obrigações */}
      {analysis.obrigacoes?.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
            <ListChecks className="h-3.5 w-3.5" />
            {t('portal.analysis.obligations')}
          </p>
          <ul className="space-y-1.5">
            {analysis.obrigacoes.map((o, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span>
                  {o.descricao}
                  {(o.responsavel || o.prazo) && (
                    <span className="text-ink-mute">
                      {' '}
                      ({[o.responsavel, o.prazo].filter(Boolean).join(' · ')})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10.5px] leading-relaxed text-ink-mute">
        {t('portal.analysis.disclaimer')}
      </p>
    </div>
  );
}
