import { differenceInDays, format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import type { Contrato } from '@/hooks/useContratos';

/** Tom visual do estado do contrato, mapeado para tokens de design existentes. */
export type EstadoTone = 'neutral' | 'warn' | 'positive' | 'danger';

interface EstadoMeta {
  /** Chave i18n em `status.*`. */
  i18nKey: string;
  tone: EstadoTone;
}

const ESTADO_META: Record<string, EstadoMeta> = {
  rascunho: { i18nKey: 'status.draft', tone: 'neutral' },
  em_revisao: { i18nKey: 'status.inReview', tone: 'warn' },
  em_aprovacao: { i18nKey: 'status.inApproval', tone: 'warn' },
  enviado_para_assinatura: { i18nKey: 'status.sentForSignature', tone: 'warn' },
  activo: { i18nKey: 'status.active', tone: 'positive' },
  expirado: { i18nKey: 'status.expired', tone: 'danger' },
  denunciado: { i18nKey: 'status.denounced', tone: 'danger' },
  rescindido: { i18nKey: 'status.rescinded', tone: 'danger' },
  arquivado: { i18nKey: 'status.archived', tone: 'neutral' },
};

export function estadoMeta(estado: string): EstadoMeta {
  return ESTADO_META[estado] ?? { i18nKey: estado, tone: 'neutral' };
}

/** Classes Tailwind por tom, alinhadas com os badges do cockpit. */
export const ESTADO_TONE_CLASS: Record<EstadoTone, string> = {
  neutral: 'border-line bg-bg-alt text-ink-soft',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  positive: 'border-positive/40 bg-positive/10 text-positive',
  danger: 'border-danger/40 bg-danger/10 text-danger',
};

const TIPO_I18N: Record<string, string> = {
  nda: 'contractTypes.nda',
  prestacao_servicos: 'contractTypes.services',
  fornecimento: 'contractTypes.supply',
  saas: 'contractTypes.saas',
  arrendamento: 'contractTypes.lease',
  trabalho: 'contractTypes.employment',
  licenciamento: 'contractTypes.licensing',
  parceria: 'contractTypes.partnership',
  consultoria: 'contractTypes.consulting',
  outro: 'contractTypes.other',
};

export function tipoI18nKey(tipo: string): string | null {
  return TIPO_I18N[tipo] ?? null;
}

export function dateFnsLocale(language: string) {
  return language?.startsWith('pt') ? pt : enUS;
}

export function formatDate(value: string | null | undefined, language: string): string | null {
  if (!value) return null;
  return format(new Date(value), 'dd/MM/yyyy', { locale: dateFnsLocale(language) });
}

export function formatCurrency(
  value: number | null | undefined,
  language: string,
  moeda?: string | null,
): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(language?.startsWith('pt') ? 'pt-PT' : 'en-GB', {
    style: 'currency',
    currency: moeda || 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Próximo prazo relevante para o cliente: decisão de renovação ou termo. */
export interface NextDeadline {
  /** 'renewal' | 'term' | null */
  kind: 'renewal' | 'term' | null;
  date: Date | null;
  days: number | null;
}

export type DeadlineKind = 'renewal' | 'term' | 'notice';

export interface ContratoDeadline {
  kind: DeadlineKind;
  date: Date;
  days: number;
}

/**
 * Todos os prazos relevantes de um contrato para o cliente:
 *  - renovação: data limite de decisão de renovação
 *  - termo: data de termo do contrato
 *  - aviso: data limite para aviso prévio de não renovação (termo − dias de aviso)
 */
export function getContratoDeadlines(c: Contrato): ContratoDeadline[] {
  const out: ContratoDeadline[] = [];
  const now = new Date();

  if (c.data_limite_decisao_renovacao) {
    const date = new Date(c.data_limite_decisao_renovacao);
    out.push({ kind: 'renewal', date, days: differenceInDays(date, now) });
  }
  if (c.data_termo) {
    const termDate = new Date(c.data_termo);
    out.push({ kind: 'term', date: termDate, days: differenceInDays(termDate, now) });

    if (c.aviso_previo_nao_renovacao_dias && c.aviso_previo_nao_renovacao_dias > 0) {
      const noticeDate = new Date(
        termDate.getTime() - c.aviso_previo_nao_renovacao_dias * 24 * 60 * 60 * 1000,
      );
      out.push({ kind: 'notice', date: noticeDate, days: differenceInDays(noticeDate, now) });
    }
  }

  return out;
}

export function getNextDeadline(c: Contrato): NextDeadline {
  const candidates: Array<{ date: Date; kind: 'renewal' | 'term' }> = [];
  if (c.data_limite_decisao_renovacao) {
    candidates.push({ date: new Date(c.data_limite_decisao_renovacao), kind: 'renewal' });
  }
  if (c.data_termo) {
    candidates.push({ date: new Date(c.data_termo), kind: 'term' });
  }
  if (candidates.length === 0) return { kind: null, date: null, days: null };

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const best = candidates[0];
  return { kind: best.kind, date: best.date, days: differenceInDays(best.date, new Date()) };
}
