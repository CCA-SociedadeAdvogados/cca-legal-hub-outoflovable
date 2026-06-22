import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { KPI } from '@/components/cca';
import { cn } from '@/lib/utils';
import type { Contrato } from '@/hooks/useContratos';
import { getNextDeadline } from '@/portal/lib/contrato';

const PREPARACAO = new Set(['rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura']);
const TERMINADO = new Set(['expirado', 'denunciado', 'rescindido']);

interface PhaseSeg {
  key: 'preparacao' | 'vigor' | 'terminado';
  count: number;
  bar: string;
  dot: string;
}

/**
 * Visão macro do ciclo de vida da carteira de contratos — minimalista:
 * 3 indicadores essenciais + uma barra de distribuição por fase.
 * Calculada a partir dos contratos já carregados (sem consultas extra).
 */
export function ContratosLifecycle({ contratos }: { contratos: Contrato[] }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    let prep = 0;
    let vigor = 0;
    let term = 0;
    let atencao = 0;
    for (const c of contratos) {
      if (c.estado_contrato === 'activo') vigor++;
      else if (PREPARACAO.has(c.estado_contrato)) prep++;
      else if (TERMINADO.has(c.estado_contrato)) term++;

      if (c.estado_contrato === 'activo') {
        const { days } = getNextDeadline(c);
        if (days !== null && days >= 0 && days <= 90) atencao++;
      }
    }
    return { prep, vigor, term, atencao };
  }, [contratos]);

  if (contratos.length === 0) return null;

  const phases: PhaseSeg[] = [
    { key: 'preparacao', count: stats.prep, bar: 'bg-warn', dot: 'bg-warn' },
    { key: 'vigor', count: stats.vigor, bar: 'bg-brand', dot: 'bg-brand' },
    { key: 'terminado', count: stats.term, bar: 'bg-ink-mute/40', dot: 'bg-ink-mute/50' },
  ];
  const total = phases.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <section className="space-y-4">
      {/* Indicadores essenciais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI label={t('portal.lifecycle.inForce')} value={stats.vigor} />
        <KPI
          label={t('portal.lifecycle.attention')}
          value={stats.atencao}
          trend={stats.atencao > 0 ? 'warn' : 'flat'}
        />
        <KPI label={t('portal.lifecycle.terminated')} value={stats.term} />
      </div>

      {/* Barra de distribuição por fase */}
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
          {t('portal.lifecycle.byPhase')}
        </p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg-alt">
          {phases.map(
            (p) =>
              p.count > 0 && (
                <div
                  key={p.key}
                  className={cn('h-full', p.bar)}
                  style={{ width: `${(p.count / total) * 100}%` }}
                  title={t(`portal.lifecycle.phases.${p.key}`)}
                />
              ),
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {phases.map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"
            >
              <span className={cn('h-2 w-2 rounded-full', p.dot)} />
              {t(`portal.lifecycle.phases.${p.key}`)}
              <span className="font-mono text-ink-mute">{p.count}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
