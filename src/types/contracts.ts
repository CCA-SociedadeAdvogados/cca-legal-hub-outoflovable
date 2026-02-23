// Contract Management Types - Full Model

// Enums
export type TipoContrato = 
  | 'nda'
  | 'prestacao_servicos'
  | 'fornecimento'
  | 'saas'
  | 'arrendamento'
  | 'trabalho'
  | 'licenciamento'
  | 'parceria'
  | 'consultoria'
  | 'outro';

export type EstadoContrato = 
  | 'rascunho'
  | 'em_revisao'
  | 'em_aprovacao'
  | 'enviado_para_assinatura'
  | 'activo'
  | 'expirado'
  | 'denunciado'
  | 'rescindido';

export type Departamento = 
  | 'comercial'
  | 'operacoes'
  | 'it'
  | 'rh'
  | 'financeiro'
  | 'juridico'
  | 'marketing'
  | 'outro';

export type TipoDuracao = 'prazo_determinado' | 'prazo_indeterminado';

export type TipoRenovacao = 
  | 'sem_renovacao_automatica'
  | 'renovacao_automatica'
  | 'renovacao_mediante_acordo';

export type EstruturaPrecos = 'fixo' | 'hora' | 'unidade' | 'success_fee' | 'misto';

export type PeriodicidadeFaturacao = 
  | 'mensal'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'por_marco'
  | 'a_cabeca';

export type PapelEntidade = 
  | 'responsavel_tratamento'
  | 'subcontratante'
  | 'corresponsavel';

export type EstadoAprovacao = 'pendente' | 'aprovado' | 'rejeitado';

export type MetodoAssinatura = 
  | 'assinatura_digital_qualificada'
  | 'assinatura_avancada'
  | 'assinatura_simples'
  | 'manuscrita';

export type ResultadoRevisao = 'renovado' | 'renegociado' | 'terminado';

export type TipoGarantia = 'garantia_bancaria' | 'seguro_caucao' | 'deposito' | 'outro';

export type TipoEventoCicloVida = 
  | 'criacao'
  | 'assinatura'
  | 'inicio_vigencia'
  | 'renovacao'
  | 'adenda'
  | 'rescisao'
  | 'denuncia'
  | 'expiracao'
  | 'nota_interna'
  | 'alteracao';

// Main Contract Interface
export interface ContratoCompleto {
  id: string;
  
  // SECÇÃO 1 - Identificação Básica
  id_interno: string;
  titulo_contrato: string;
  tipo_contrato: TipoContrato;
  objeto_resumido: string;
  estado_contrato: EstadoContrato;
  departamento_responsavel: Departamento;
  responsavel_interno_id?: string;
  responsavel_interno_nome?: string;
  
  // SECÇÃO 2 - Partes Contratantes
  parte_a_nome_legal: string;
  parte_a_nif: string;
  parte_a_morada: string;
  parte_a_pais: string;
  
  parte_b_nome_legal: string;
  parte_b_nif: string;
  parte_b_grupo_economico?: string;
  parte_b_morada: string;
  parte_b_pais: string;
  
  // Contactos
  contacto_comercial_nome?: string;
  contacto_comercial_email?: string;
  contacto_comercial_telefone?: string;
  contacto_operacional_nome?: string;
  contacto_operacional_email?: string;
  contacto_faturacao_nome?: string;
  contacto_faturacao_email?: string;
  contacto_legal_nome?: string;
  contacto_legal_email?: string;
  
  // SECÇÃO 3 - Datas, Duração e Renovação
  data_criacao_registo: Date;
  data_assinatura_parte_a?: Date;
  data_assinatura_parte_b?: Date;
  data_inicio_vigencia?: Date;
  data_termo?: Date;
  tipo_duracao: TipoDuracao;
  tipo_renovacao: TipoRenovacao;
  renovacao_periodo_meses?: number;
  aviso_previo_nao_renovacao_dias?: number;
  prazos_denuncia_rescisao?: string;
  
  // SECÇÃO 4 - Condições Económicas
  valor_total_estimado?: number;
  moeda: string;
  estrutura_precos: EstruturaPrecos;
  valor_anual_recorrente?: number;
  prazo_pagamento_dias?: number;
  periodicidade_faturacao?: PeriodicidadeFaturacao;
  centro_custo?: string;
  numero_encomenda_po?: string;
  
  // SECÇÃO 5 - Obrigações, Riscos e Garantias
  obrigacoes_parte_a?: string;
  obrigacoes_parte_b?: string;
  sla_kpi_resumo?: string;
  limite_responsabilidade?: string;
  clausula_indemnizacao: boolean;
  clausula_indemnizacao_resumo?: string;
  garantia_existente: boolean;
  garantia_tipo?: TipoGarantia;
  garantia_valor?: number;
  garantia_data_validade?: Date;
  flag_confidencialidade: boolean;
  flag_nao_concorrencia: boolean;
  flag_exclusividade: boolean;
  flag_direito_subcontratar: boolean;
  condicoes_subcontratacao?: string;
  
  // SECÇÃO 6 - Conformidade, RGPD e Privacidade
  tratamento_dados_pessoais: boolean;
  categorias_dados_pessoais?: string;
  categorias_titulares?: string;
  papel_entidade?: PapelEntidade;
  transferencia_internacional: boolean;
  paises_transferencia?: string;
  base_legal_transferencia?: string;
  existe_dpa_anexo_rgpd: boolean;
  referencia_dpa?: string;
  dpia_realizada: boolean;
  referencia_dpia?: string;
  
  // SECÇÃO 7 - Workflow de Aprovação e Assinatura
  iniciado_por_id?: string;
  iniciado_por_nome?: string;
  aprovadores_internos?: string;
  estado_aprovacao: EstadoAprovacao;
  comentarios_aprovacao?: string;
  metodo_assinatura?: MetodoAssinatura;
  ferramenta_assinatura?: string;
  data_conclusao_assinatura?: Date;
  
  // SECÇÃO 8 - Renovações e Alertas
  data_limite_decisao_renovacao?: Date;
  responsavel_revisao_renovacao_id?: string;
  responsavel_revisao_renovacao_nome?: string;
  alerta_renovacao_90_dias: boolean;
  alerta_renovacao_60_dias: boolean;
  alerta_renovacao_30_dias: boolean;
  resultado_ultima_revisao?: ResultadoRevisao;
  observacoes_ultima_revisao?: string;
  
  // SECÇÃO 9 - Anexos e Contratos Relacionados
  numero_adendas: number;
  contratos_relacionados?: string;
  
  // SECÇÃO 10 - Auditoria e Histórico
  versao_actual: number;
  motivo_ultima_alteracao?: string;
  
  // Sistema
  created_at: Date;
  updated_at: Date;
  created_by_id?: string;
  created_by_nome?: string;
  updated_by_id?: string;
  updated_by_nome?: string;
  arquivado: boolean;
}

// Contract Attachment Interface
export interface AnexoContrato {
  id: string;
  contrato_id: string;
  nome_ficheiro: string;
  tipo_anexo: 'pdf_principal' | 'anexo' | 'adenda' | 'outro';
  descricao?: string;
  url_ficheiro: string;
  tamanho_bytes: number;
  mime_type: string;
  uploaded_at: Date;
  uploaded_by_id: string;
  uploaded_by_nome: string;
}

// Contract Lifecycle Event Interface
export interface EventoCicloVidaContrato {
  id: string;
  contrato_id: string;
  tipo_evento: TipoEventoCicloVida;
  data_evento: Date;
  descricao: string;
  criado_por_id: string;
  criado_por_nome: string;
  created_at: Date;
}

// Labels for display
export const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  nda: 'NDA / Acordo de Confidencialidade',
  prestacao_servicos: 'Prestação de Serviços',
  fornecimento: 'Fornecimento',
  saas: 'SaaS / Licenciamento Software',
  arrendamento: 'Arrendamento',
  trabalho: 'Contrato de Trabalho',
  licenciamento: 'Licenciamento',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

export const ESTADO_CONTRATO_LABELS: Record<EstadoContrato, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  em_aprovacao: 'Em Aprovação',
  enviado_para_assinatura: 'Enviado para Assinatura',
  activo: 'Activo',
  expirado: 'Expirado',
  denunciado: 'Denunciado',
  rescindido: 'Rescindido',
};

export const DEPARTAMENTO_LABELS: Record<Departamento, string> = {
  comercial: 'Comercial',
  operacoes: 'Operações',
  it: 'IT / Tecnologia',
  rh: 'Recursos Humanos',
  financeiro: 'Financeiro',
  juridico: 'Jurídico',
  marketing: 'Marketing',
  outro: 'Outro',
};

export const TIPO_DURACAO_LABELS: Record<TipoDuracao, string> = {
  prazo_determinado: 'Prazo Determinado',
  prazo_indeterminado: 'Prazo Indeterminado',
};

export const TIPO_RENOVACAO_LABELS: Record<TipoRenovacao, string> = {
  sem_renovacao_automatica: 'Sem Renovação Automática',
  renovacao_automatica: 'Renovação Automática',
  renovacao_mediante_acordo: 'Renovação Mediante Acordo',
};

export const ESTRUTURA_PRECOS_LABELS: Record<EstruturaPrecos, string> = {
  fixo: 'Preço Fixo',
  hora: 'Por Hora',
  unidade: 'Por Unidade',
  success_fee: 'Success Fee',
  misto: 'Misto',
};

export const PERIODICIDADE_FATURACAO_LABELS: Record<PeriodicidadeFaturacao, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  por_marco: 'Por Marco/Milestone',
  a_cabeca: 'A Cabeça',
};

export const PAPEL_ENTIDADE_LABELS: Record<PapelEntidade, string> = {
  responsavel_tratamento: 'Responsável pelo Tratamento',
  subcontratante: 'Subcontratante',
  corresponsavel: 'Corresponsável',
};

export const ESTADO_APROVACAO_LABELS: Record<EstadoAprovacao, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export const METODO_ASSINATURA_LABELS: Record<MetodoAssinatura, string> = {
  assinatura_digital_qualificada: 'Assinatura Digital Qualificada',
  assinatura_avancada: 'Assinatura Avançada',
  assinatura_simples: 'Assinatura Simples',
  manuscrita: 'Manuscrita',
};

export const RESULTADO_REVISAO_LABELS: Record<ResultadoRevisao, string> = {
  renovado: 'Renovado',
  renegociado: 'Renegociado',
  terminado: 'Terminado',
};

export const TIPO_GARANTIA_LABELS: Record<TipoGarantia, string> = {
  garantia_bancaria: 'Garantia Bancária',
  seguro_caucao: 'Seguro Caução',
  deposito: 'Depósito',
  outro: 'Outro',
};

export const TIPO_EVENTO_CICLO_VIDA_LABELS: Record<TipoEventoCicloVida, string> = {
  criacao: 'Criação',
  assinatura: 'Assinatura',
  inicio_vigencia: 'Início de Vigência',
  renovacao: 'Renovação',
  adenda: 'Adenda',
  rescisao: 'Rescisão',
  denuncia: 'Denúncia',
  expiracao: 'Expiração',
  nota_interna: 'Nota Interna',
  alteracao: 'Alteração',
};
