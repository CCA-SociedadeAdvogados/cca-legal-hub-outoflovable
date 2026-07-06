import type { TablesInsert } from '@/integrations/supabase/types';

/**
 * Mapeia os campos devolvidos pelo parse-contract (RGPD, financeiro e
 * cláusulas especiais) para colunas da tabela contratos. Só devolve chaves
 * com valor validado — nunca inventa nem sobrepõe com lixo.
 *
 * Usado pelo upload em massa; o formulário individual aplica os mesmos campos
 * via react-hook-form (ver handleDataExtracted em ContratoForm).
 */

const PAPEIS_ENTIDADE = ['responsavel_tratamento', 'subcontratante', 'corresponsavel'] as const;
const PERIODICIDADES = [
  'mensal',
  'trimestral',
  'semestral',
  'anual',
  'por_marco',
  'a_cabeca',
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapExtractedToContrato(data: any): Partial<TablesInsert<'contratos'>> {
  const out: Partial<TablesInsert<'contratos'>> = {};
  if (!data || typeof data !== 'object') return out;

  // RGPD
  if (data.tratamento_dados_pessoais === true || data.clausulas_especiais?.protecao_dados === true)
    out.tratamento_dados_pessoais = true;
  if (data.existe_dpa_anexo_rgpd === true) out.existe_dpa_anexo_rgpd = true;
  if (data.transferencia_internacional === true) out.transferencia_internacional = true;
  if (typeof data.categorias_dados_pessoais === 'string' && data.categorias_dados_pessoais)
    out.categorias_dados_pessoais = data.categorias_dados_pessoais;
  const papel =
    data.papel_entidade === 'responsavel' ? 'responsavel_tratamento' : data.papel_entidade;
  if (PAPEIS_ENTIDADE.includes(papel)) out.papel_entidade = papel;

  // Financeiro
  if (typeof data.valor_total_estimado === 'number' && isFinite(data.valor_total_estimado))
    out.valor_total_estimado = data.valor_total_estimado;
  if (typeof data.moeda === 'string' && /^[A-Z]{3}$/.test(data.moeda)) out.moeda = data.moeda;
  if (typeof data.prazo_pagamento_dias === 'number' && isFinite(data.prazo_pagamento_dias))
    out.prazo_pagamento_dias = data.prazo_pagamento_dias;
  if (PERIODICIDADES.includes(data.periodicidade_faturacao))
    out.periodicidade_faturacao = data.periodicidade_faturacao;

  // Cláusulas especiais → flags
  const ce = data.clausulas_especiais;
  if (ce && typeof ce === 'object') {
    if (ce.confidencialidade === true) out.flag_confidencialidade = true;
    if (ce.nao_concorrencia === true) out.flag_nao_concorrencia = true;
    if (ce.exclusividade === true) out.flag_exclusividade = true;
    if (ce.subcontratacao === true) out.flag_direito_subcontratar = true;
  }

  return out;
}
