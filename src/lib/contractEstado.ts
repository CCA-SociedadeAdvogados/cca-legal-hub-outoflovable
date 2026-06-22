import type { EstadoContrato } from '@/types/contracts';
import { ESTADO_CONTRATO_LABELS } from '@/types/contracts';

/**
 * Fonte única de verdade para a apresentação do estado de um contrato no cockpit.
 * Os rótulos vêm de ESTADO_CONTRATO_LABELS (em types/contracts) para que tabela,
 * ficha de detalhe e ações de transição usem exactamente a mesma linguagem.
 */

export type ContractPhase = 'preparacao' | 'vigor' | 'terminado';

const PHASE_OF: Record<EstadoContrato, ContractPhase> = {
  rascunho: 'preparacao',
  em_revisao: 'preparacao',
  em_aprovacao: 'preparacao',
  enviado_para_assinatura: 'preparacao',
  activo: 'vigor',
  expirado: 'terminado',
  denunciado: 'terminado',
  rescindido: 'terminado',
};

/** Agrupamento macro (em preparação · em vigor · terminado) para vistas agregadas. */
export function getContractPhase(estado: EstadoContrato): ContractPhase {
  return PHASE_OF[estado];
}

/** Classe de badge (cor) por estado — alinhada com os tons de fase do cockpit. */
export const ESTADO_BADGE_CLASS: Record<EstadoContrato, string> = {
  rascunho: 'border-line bg-bg-alt text-ink-soft',
  em_revisao: 'border-warn/40 bg-warn/10 text-warn',
  em_aprovacao: 'border-warn/40 bg-warn/10 text-warn',
  enviado_para_assinatura: 'border-warn/40 bg-warn/10 text-warn',
  activo: 'border-positive/40 bg-positive/10 text-positive',
  expirado: 'border-danger/40 bg-danger/10 text-danger',
  denunciado: 'border-danger/40 bg-danger/10 text-danger',
  rescindido: 'border-danger/40 bg-danger/10 text-danger',
};

/** Rótulo legível do estado (fallback para o próprio valor se desconhecido). */
export function estadoLabel(estado: string): string {
  return ESTADO_CONTRATO_LABELS[estado as EstadoContrato] ?? estado;
}

/** Classe de badge do estado (fallback neutro se desconhecido). */
export function estadoBadgeClass(estado: string): string {
  return ESTADO_BADGE_CLASS[estado as EstadoContrato] ?? 'border-line bg-bg-alt text-ink-mute';
}
