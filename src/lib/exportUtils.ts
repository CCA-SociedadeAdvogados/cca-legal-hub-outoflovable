import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  TIPO_CONTRATO_LABELS, 
  ESTADO_CONTRATO_LABELS, 
  DEPARTAMENTO_LABELS,
  TIPO_DURACAO_LABELS,
  TIPO_RENOVACAO_LABELS,
} from '@/types/contracts';
import type { Contrato } from '@/hooks/useContratos';

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: pt });
  } catch {
    return '';
  }
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
};

const escapeCSV = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportContratosToCSV = (contratos: Contrato[]): void => {
  const headers = [
    'ID Interno',
    'Título',
    'Tipo',
    'Estado',
    'Departamento',
    'Parte A (Nome)',
    'Parte A (NIF)',
    'Parte B (Nome)',
    'Parte B (NIF)',
    'Data Início Vigência',
    'Data Termo',
    'Tipo Duração',
    'Tipo Renovação',
    'Valor Total Estimado',
    'Valor Anual Recorrente',
    'Moeda',
    'Criado em',
    'Atualizado em',
  ];

  const rows = contratos.map((c) => [
    escapeCSV(c.id_interno),
    escapeCSV(c.titulo_contrato),
    escapeCSV(TIPO_CONTRATO_LABELS[c.tipo_contrato as keyof typeof TIPO_CONTRATO_LABELS] || c.tipo_contrato),
    escapeCSV(ESTADO_CONTRATO_LABELS[c.estado_contrato as keyof typeof ESTADO_CONTRATO_LABELS] || c.estado_contrato),
    escapeCSV(DEPARTAMENTO_LABELS[c.departamento_responsavel as keyof typeof DEPARTAMENTO_LABELS] || c.departamento_responsavel),
    escapeCSV(c.parte_a_nome_legal),
    escapeCSV(c.parte_a_nif),
    escapeCSV(c.parte_b_nome_legal),
    escapeCSV(c.parte_b_nif),
    formatDate(c.data_inicio_vigencia),
    formatDate(c.data_termo),
    escapeCSV(TIPO_DURACAO_LABELS[c.tipo_duracao as keyof typeof TIPO_DURACAO_LABELS] || c.tipo_duracao),
    escapeCSV(TIPO_RENOVACAO_LABELS[c.tipo_renovacao as keyof typeof TIPO_RENOVACAO_LABELS] || c.tipo_renovacao),
    formatCurrency(c.valor_total_estimado),
    formatCurrency(c.valor_anual_recorrente),
    escapeCSV(c.moeda),
    formatDate(c.created_at),
    formatDate(c.updated_at),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contratos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
