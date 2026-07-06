import { describe, it, expect } from 'vitest';
import { mapExtractedToContrato } from '@/lib/contractExtraction';

describe('mapExtractedToContrato', () => {
  it('devolve objecto vazio para input inválido', () => {
    expect(mapExtractedToContrato(null)).toEqual({});
    expect(mapExtractedToContrato(undefined)).toEqual({});
    expect(mapExtractedToContrato('texto')).toEqual({});
    expect(mapExtractedToContrato({})).toEqual({});
  });

  it('mapeia os campos RGPD válidos', () => {
    const out = mapExtractedToContrato({
      tratamento_dados_pessoais: true,
      existe_dpa_anexo_rgpd: true,
      transferencia_internacional: true,
      categorias_dados_pessoais: 'Dados de identificação e contacto',
      papel_entidade: 'subcontratante',
    });
    expect(out).toEqual({
      tratamento_dados_pessoais: true,
      existe_dpa_anexo_rgpd: true,
      transferencia_internacional: true,
      categorias_dados_pessoais: 'Dados de identificação e contacto',
      papel_entidade: 'subcontratante',
    });
  });

  it('normaliza papel_entidade "responsavel" (prompt antigo) para o enum da BD', () => {
    expect(mapExtractedToContrato({ papel_entidade: 'responsavel' }).papel_entidade).toBe(
      'responsavel_tratamento',
    );
  });

  it('ignora papel_entidade fora do enum', () => {
    expect(mapExtractedToContrato({ papel_entidade: 'gestor' })).toEqual({});
  });

  it('não define booleans RGPD quando a IA devolve false', () => {
    const out = mapExtractedToContrato({
      tratamento_dados_pessoais: false,
      existe_dpa_anexo_rgpd: false,
    });
    expect(out).toEqual({});
  });

  it('activa tratamento_dados_pessoais via clausulas_especiais.protecao_dados', () => {
    const out = mapExtractedToContrato({ clausulas_especiais: { protecao_dados: true } });
    expect(out.tratamento_dados_pessoais).toBe(true);
  });

  it('mapeia campos financeiros válidos e rejeita inválidos', () => {
    const out = mapExtractedToContrato({
      valor_total_estimado: 12500.5,
      moeda: 'USD',
      prazo_pagamento_dias: 30,
      periodicidade_faturacao: 'mensal',
    });
    expect(out).toMatchObject({
      valor_total_estimado: 12500.5,
      moeda: 'USD',
      prazo_pagamento_dias: 30,
      periodicidade_faturacao: 'mensal',
    });

    expect(
      mapExtractedToContrato({
        valor_total_estimado: 'muito',
        moeda: 'euros',
        prazo_pagamento_dias: NaN,
        periodicidade_faturacao: 'quinzenal',
      }),
    ).toEqual({});
  });

  it('mapeia cláusulas especiais para as flags do contrato', () => {
    const out = mapExtractedToContrato({
      clausulas_especiais: {
        confidencialidade: true,
        nao_concorrencia: true,
        exclusividade: false,
        subcontratacao: true,
      },
    });
    expect(out).toEqual({
      flag_confidencialidade: true,
      flag_nao_concorrencia: true,
      flag_direito_subcontratar: true,
    });
  });
});
