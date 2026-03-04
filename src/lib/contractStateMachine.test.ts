import { describe, it, expect } from 'vitest';
import {
  canTransitionTo,
  getValidEventsForState,
  getStateChangeForEvent,
  VALID_STATE_TRANSITIONS,
  VALID_EVENTS_PER_STATE,
} from '@/lib/contractStateMachine';
import type { EstadoContrato, TipoEventoCicloVida } from '@/types/contracts';

describe('contractStateMachine', () => {
  describe('canTransitionTo', () => {
    it('allows rascunho → em_revisao', () => {
      expect(canTransitionTo('rascunho', 'em_revisao')).toBe(true);
    });

    it('allows rascunho → activo', () => {
      expect(canTransitionTo('rascunho', 'activo')).toBe(true);
    });

    it('rejects rascunho → expirado (invalid)', () => {
      expect(canTransitionTo('rascunho', 'expirado')).toBe(false);
    });

    it('rejects rascunho → rescindido (invalid)', () => {
      expect(canTransitionTo('rascunho', 'rescindido')).toBe(false);
    });

    it('allows activo → expirado', () => {
      expect(canTransitionTo('activo', 'expirado')).toBe(true);
    });

    it('allows activo → denunciado', () => {
      expect(canTransitionTo('activo', 'denunciado')).toBe(true);
    });

    it('allows activo → rescindido', () => {
      expect(canTransitionTo('activo', 'rescindido')).toBe(true);
    });

    it('rejects activo → rascunho (no backwards)', () => {
      expect(canTransitionTo('activo', 'rascunho')).toBe(false);
    });

    it('denunciado is terminal — no transitions allowed', () => {
      const allStates: EstadoContrato[] = [
        'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
        'activo', 'expirado', 'denunciado', 'rescindido',
      ];
      for (const target of allStates) {
        expect(canTransitionTo('denunciado', target)).toBe(false);
      }
    });

    it('rescindido is terminal — no transitions allowed', () => {
      const allStates: EstadoContrato[] = [
        'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
        'activo', 'expirado', 'denunciado', 'rescindido',
      ];
      for (const target of allStates) {
        expect(canTransitionTo('rescindido', target)).toBe(false);
      }
    });

    it('allows expirado → activo (renovation)', () => {
      expect(canTransitionTo('expirado', 'activo')).toBe(true);
    });

    it('em_revisao can go back to rascunho', () => {
      expect(canTransitionTo('em_revisao', 'rascunho')).toBe(true);
    });

    it('em_revisao → em_aprovacao', () => {
      expect(canTransitionTo('em_revisao', 'em_aprovacao')).toBe(true);
    });
  });

  describe('getValidEventsForState', () => {
    it('returns criacao, alteracao, nota_interna for rascunho', () => {
      const events = getValidEventsForState('rascunho');
      expect(events).toContain('criacao');
      expect(events).toContain('alteracao');
      expect(events).toContain('nota_interna');
    });

    it('returns lifecycle events for activo', () => {
      const events = getValidEventsForState('activo');
      expect(events).toContain('renovacao');
      expect(events).toContain('rescisao');
      expect(events).toContain('denuncia');
      expect(events).toContain('expiracao');
      expect(events).toContain('adenda');
    });

    it('denunciado only allows nota_interna', () => {
      expect(getValidEventsForState('denunciado')).toEqual(['nota_interna']);
    });

    it('rescindido only allows nota_interna', () => {
      expect(getValidEventsForState('rescindido')).toEqual(['nota_interna']);
    });

    it('expirado allows renovacao and nota_interna', () => {
      const events = getValidEventsForState('expirado');
      expect(events).toContain('renovacao');
      expect(events).toContain('nota_interna');
      expect(events).toHaveLength(2);
    });

    it('falls back to nota_interna for unknown state', () => {
      // @ts-expect-error testing invalid input
      expect(getValidEventsForState('unknown_state')).toEqual(['nota_interna']);
    });
  });

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

    it('criacao does not change state', () => {
      expect(getStateChangeForEvent('criacao')).toBeNull();
    });

    it('adenda does not change state', () => {
      expect(getStateChangeForEvent('adenda')).toBeNull();
    });
  });

  describe('data completeness', () => {
    const allStates: EstadoContrato[] = [
      'rascunho', 'em_revisao', 'em_aprovacao', 'enviado_para_assinatura',
      'activo', 'expirado', 'denunciado', 'rescindido',
    ];

    it('VALID_STATE_TRANSITIONS covers all states', () => {
      for (const state of allStates) {
        expect(VALID_STATE_TRANSITIONS).toHaveProperty(state);
      }
    });

    it('VALID_EVENTS_PER_STATE covers all states', () => {
      for (const state of allStates) {
        expect(VALID_EVENTS_PER_STATE).toHaveProperty(state);
      }
    });

    it('every state allows nota_interna', () => {
      for (const state of allStates) {
        expect(VALID_EVENTS_PER_STATE[state]).toContain('nota_interna');
      }
    });
  });
});
