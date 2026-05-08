import { z } from 'zod';

export const contratoFormSchema = z.object({
  // Identificação
  titulo_contrato: z.string().min(1, 'Título é obrigatório'),
  tipo_contrato: z.string().min(1, 'Tipo é obrigatório'),
  tipo_contrato_personalizado: z.string().optional(),
  departamento_responsavel: z.string().min(1, 'Departamento é obrigatório'),
  objeto_resumido: z.string().optional(),

  // Partes
  parte_a_nome_legal: z.string().min(1, 'Nome legal da Parte A é obrigatório'),
  parte_a_nif: z.string().optional(),
  parte_a_morada: z.string().optional(),
  parte_a_pais: z.string().default('Portugal'),
  parte_b_nome_legal: z.string().min(1, 'Nome legal da Parte B é obrigatório'),
  parte_b_nif: z.string().optional(),
  parte_b_morada: z.string().optional(),
  parte_b_pais: z.string().default('Portugal'),
  parte_b_grupo_economico: z.string().optional(),

  // Datas
  data_assinatura_parte_a: z.date().optional().nullable(),
  data_assinatura_parte_b: z.date().optional().nullable(),
  data_inicio_vigencia: z.date().optional().nullable(),
  data_termo: z.date().optional().nullable(),
  tipo_duracao: z.string().default('prazo_determinado'),
  tipo_renovacao: z.string().default('sem_renovacao_automatica'),
  renovacao_periodo_meses: z.number().optional().nullable(),
  aviso_previo_nao_renovacao_dias: z.number().default(30),

  // Obrigações e Riscos
  obrigacoes_parte_a: z.string().optional(),
  obrigacoes_parte_b: z.string().optional(),
  sla_kpi_resumo: z.string().optional(),
  limite_responsabilidade: z.string().optional(),
  clausula_indemnizacao: z.boolean().default(false),
  clausula_indemnizacao_resumo: z.string().optional(),
  flag_confidencialidade: z.boolean().default(false),
  flag_nao_concorrencia: z.boolean().default(false),
  flag_exclusividade: z.boolean().default(false),
  flag_direito_subcontratar: z.boolean().default(false),

  // Garantias
  garantia_existente: z.boolean().default(false),
  garantia_tipo: z.string().optional(),
  garantia_valor: z.number().optional().nullable(),
  garantia_data_validade: z.date().optional().nullable(),

  // RGPD
  tratamento_dados_pessoais: z.boolean().default(false),
  papel_entidade: z.string().optional(),
  categorias_dados_pessoais: z.string().optional(),
  categorias_titulares: z.string().optional(),
  transferencia_internacional: z.boolean().default(false),
  paises_transferencia: z.string().optional(),
  base_legal_transferencia: z.string().optional(),
  existe_dpa_anexo_rgpd: z.boolean().default(false),
  referencia_dpa: z.string().optional(),
  dpia_realizada: z.boolean().default(false),
  referencia_dpia: z.string().optional(),
});

export type ContratoFormValues = z.infer<typeof contratoFormSchema>;
