import type { EstadoContrato, TipoEventoCicloVida } from '@/types/contracts';

// Transições de estado válidas
export const VALID_STATE_TRANSITIONS: Record<EstadoContrato, EstadoContrato[]> = {
  rascunho: ['em_revisao', 'activo'],
  em_revisao: ['rascunho', 'em_aprovacao', 'activo'],
  em_aprovacao: ['em_revisao', 'activo'],
  enviado_para_assinatura: ['activo', 'em_revisao'],
  activo: ['expirado', 'denunciado', 'rescindido'],
  expirado: ['activo'], // renovação
  denunciado: [],
  rescindido: [],
};

// Eventos válidos por estado
export const VALID_EVENTS_PER_STATE: Record<EstadoContrato, TipoEventoCicloVida[]> = {
  rascunho: ['criacao', 'alteracao', 'nota_interna'],
  em_revisao: ['alteracao', 'nota_interna'],
  em_aprovacao: ['nota_interna'],
  enviado_para_assinatura: ['assinatura', 'nota_interna'],
  activo: ['inicio_vigencia', 'renovacao', 'adenda', 'rescisao', 'denuncia', 'expiracao', 'nota_interna', 'alteracao'],
  expirado: ['renovacao', 'nota_interna'],
  denunciado: ['nota_interna'],
  rescindido: ['nota_interna'],
};

// Mapa de eventos que automaticamente mudam o estado
export const EVENT_STATE_CHANGES: Partial<Record<TipoEventoCicloVida, EstadoContrato>> = {
  rescisao: 'rescindido',
  denuncia: 'denunciado',
  expiracao: 'expirado',
  renovacao: 'activo',
};

export function canTransitionTo(currentState: EstadoContrato, newState: EstadoContrato): boolean {
  return VALID_STATE_TRANSITIONS[currentState]?.includes(newState) ?? false;
}

export function getValidEventsForState(state: EstadoContrato): TipoEventoCicloVida[] {
  return VALID_EVENTS_PER_STATE[state] || ['nota_interna'];
}

export function getStateChangeForEvent(event: TipoEventoCicloVida): EstadoContrato | null {
  return EVENT_STATE_CHANGES[event] || null;
}
