import { describe, it, expect } from 'vitest';
import {
  canTransitionTo,
  getValidEventsForState,
  getStateChangeForEvent,
  VALID_STATE_TRANSITIONS,
  VALID_EVENTS_PER_STATE,
  EVENT_STATE_CHANGES,
} from '@/lib/contractStateMachine';
import type { EstadoContrato, TipoEventoCicloVida } from '@/types/contracts';

// ---------------------------------------------------------------------------
// canTransitionTo
// ---------------------------------------------------------------------------
describe('canTransitionTo', () => {
  it('rascunho → em_revisao is valid', () => {
    expect(canTransitionTo('rascunho', 'em_revisao')).toBe(true);
  });

  it('rascunho → activo is valid (direct activation)', () => {
    expect(canTransitionTo('rascunho', 'activo')).toBe(true);
  });

  it('rascunho → expirado is invalid', () => {
    expect(canTransitionTo('rascunho', 'expirado')).toBe(false);
  });

  it('rascunho → rescindido is invalid', () => {
    expect(canTransitionTo('rascunho', 'rescindido')).toBe(false);
  });

  it('activo → expirado is valid', () => {
    expect(canTransitionTo('activo', 'expirado')).toBe(true);
  });

  it('activo → denunciado is valid', () => {
    expect(canTransitionTo('activo', 'denunciado')).toBe(true);
  });

  it('activo → rescindido is valid', () => {
    expect(canTransitionTo('activo', 'rescindido')).toBe(true);
  });

  it('activo → rascunho is invalid (cannot go backwards)', () => {
    expect(canTransitionTo('activo', 'rascunho')).toBe(false);
  });

  it('expirado → activo is valid (via renovação)', () => {
    expect(canTransitionTo('expirado', 'activo')).toBe(true);
  });

  it('expirado → rascunho is invalid', () => {
    expect(canTransitionTo('expirado', 'rascunho')).toBe(false);
  });

  it('em_revisao → rascunho is valid (rejected back to draft)', () => {
    expect(canTransitionTo('em_revisao', 'rascunho')).toBe(true);
  });

  it('em_revisao → em_aprovacao is valid', () => {
    expect(canTransitionTo('em_revisao', 'em_aprovacao')).toBe(true);
  });

  it('em_aprovacao → activo is valid', () => {
    expect(canTransitionTo('em_aprovacao', 'activo')).toBe(true);
  });

  it('em_aprovacao → em_revisao is valid (sent back for revision)', () => {
    expect(canTransitionTo('em_aprovacao', 'em_revisao')).toBe(true);
  });

  it('enviado_para_assinatura → activo is valid', () => {
    expect(canTransitionTo('enviado_para_assinatura', 'activo')).toBe(true);
  });

  it('enviado_para_assinatura → em_revisao is valid (revision needed)', () => {
    expect(canTransitionTo('enviado_para_assinatura', 'em_revisao')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Terminal states — no further transitions allowed
// ---------------------------------------------------------------------------
describe('terminal states', () => {
  it('denunciado has no valid transitions', () => {
    expect(VALID_STATE_TRANSITIONS['denunciado']).toEqual([]);
  });

  it('rescindido has no valid transitions', () => {
    expect(VALID_STATE_TRANSITIONS['rescindido']).toEqual([]);
  });

  it('canTransitionTo returns false from denunciado to any state', () => {
    const states: EstadoContrato[] = [
      'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
      'activo', 'expirado', 'denunciado', 'rescindido',
    ];
    states.forEach((s) => {
      expect(canTransitionTo('denunciado', s)).toBe(false);
    });
  });

  it('canTransitionTo returns false from rescindido to any state', () => {
    const states: EstadoContrato[] = [
      'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
      'activo', 'expirado', 'denunciado', 'rescindido',
    ];
    states.forEach((s) => {
      expect(canTransitionTo('rescindido', s)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// getValidEventsForState
// ---------------------------------------------------------------------------
describe('getValidEventsForState', () => {
  it('activo state has the most lifecycle events', () => {
    const events = getValidEventsForState('activo');
    expect(events).toContain('inicio_vigencia');
    expect(events).toContain('renovacao');
    expect(events).toContain('adenda');
    expect(events).toContain('rescisao');
    expect(events).toContain('denuncia');
    expect(events).toContain('expiracao');
    expect(events).toContain('nota_interna');
  });

  it('rascunho allows criacao, alteracao, nota_interna', () => {
    const events = getValidEventsForState('rascunho');
    expect(events).toContain('criacao');
    expect(events).toContain('alteracao');
    expect(events).toContain('nota_interna');
  });

  it('terminal states (denunciado/rescindido) only allow nota_interna', () => {
    expect(getValidEventsForState('denunciado')).toEqual(['nota_interna']);
    expect(getValidEventsForState('rescindido')).toEqual(['nota_interna']);
  });

  it('all states are covered in VALID_EVENTS_PER_STATE', () => {
    const allStates: EstadoContrato[] = [
      'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
      'activo', 'expirado', 'denunciado', 'rescindido',
    ];
    allStates.forEach((state) => {
      expect(VALID_EVENTS_PER_STATE[state]).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// getStateChangeForEvent — auto-transition events
// ---------------------------------------------------------------------------
describe('getStateChangeForEvent', () => {
  it('rescisao → rescindido', () => {
    expect(getStateChangeForEvent('rescisao')).toBe('rescindido');
  });

  it('denuncia → denunciado', () => {
    expect(getStateChangeForEvent('denuncia')).toBe('denunciado');
  });

  it('expiracao → expirado', () => {
    expect(getStateChangeForEvent('expiracao')).toBe('expirado');
  });

  it('renovacao → activo', () => {
    expect(getStateChangeForEvent('renovacao')).toBe('activo');
  });

  it('nota_interna does not change state', () => {
    expect(getStateChangeForEvent('nota_interna')).toBeNull();
  });

  it('adenda does not change state', () => {
    expect(getStateChangeForEvent('adenda')).toBeNull();
  });

  it('alteracao does not change state', () => {
    expect(getStateChangeForEvent('alteracao')).toBeNull();
  });

  it('assinatura does not change state automatically', () => {
    expect(getStateChangeForEvent('assinatura')).toBeNull();
  });

  it('all events in EVENT_STATE_CHANGES map to a valid EstadoContrato', () => {
    const validStates: EstadoContrato[] = [
      'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
      'activo', 'expirado', 'denunciado', 'rescindido',
    ];
    Object.entries(EVENT_STATE_CHANGES).forEach(([, state]) => {
      expect(validStates).toContain(state);
    });
  });
});

// ---------------------------------------------------------------------------
// Data integrity — no state references an undefined state
// ---------------------------------------------------------------------------
describe('data integrity', () => {
  const allStates: EstadoContrato[] = [
    'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
    'activo', 'expirado', 'denunciado', 'rescindido',
  ];

  it('all transition targets are valid EstadoContrato values', () => {
    allStates.forEach((from) => {
      VALID_STATE_TRANSITIONS[from].forEach((to) => {
        expect(allStates).toContain(to);
      });
    });
  });

  it('no state transitions to itself', () => {
    allStates.forEach((state) => {
      expect(VALID_STATE_TRANSITIONS[state]).not.toContain(state);
    });
  });
});
