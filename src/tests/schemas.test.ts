/**
 * Phase 4 — Zod schema validation tests.
 *
 * We replicate the schemas from Login.tsx and ContratoForm.tsx to test
 * their validation rules in isolation (no DOM, no component rendering).
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Login.tsx schemas
// ---------------------------------------------------------------------------
const passwordSchema = z
  .string()
  .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'A palavra-passe deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A palavra-passe deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A palavra-passe deve conter pelo menos um número');

const emailSchema = z.string().email('Por favor, introduza um e-mail válido');

// ---------------------------------------------------------------------------
// ContratoForm.tsx schema (required fields only)
// ---------------------------------------------------------------------------
const contratoFormSchema = z.object({
  // Required
  titulo_contrato: z.string().min(1, 'Título é obrigatório'),
  tipo_contrato: z.string().min(1, 'Tipo é obrigatório'),
  departamento_responsavel: z.string().min(1, 'Departamento é obrigatório'),
  parte_a_nome_legal: z.string().min(1, 'Nome legal da Parte A é obrigatório'),
  parte_b_nome_legal: z.string().min(1, 'Nome legal da Parte B é obrigatório'),
  // Optional fields
  objeto_resumido: z.string().optional(),
  tipo_contrato_personalizado: z.string().optional(),
  parte_a_pais: z.string().default('Portugal'),
  parte_b_pais: z.string().default('Portugal'),
  data_termo: z.date().optional().nullable(),
  // RGPD booleans
  tratamento_dados_pessoais: z.boolean().default(false),
  transferencia_internacional: z.boolean().default(false),
  existe_dpa_anexo_rgpd: z.boolean().default(false),
  dpia_realizada: z.boolean().default(false),
  // Financial
  garantia_existente: z.boolean().default(false),
  garantia_valor: z.number().optional().nullable(),
  // Duration
  tipo_duracao: z.string().default('prazo_determinado'),
  tipo_renovacao: z.string().default('sem_renovacao_automatica'),
  aviso_previo_nao_renovacao_dias: z.number().default(30),
});

// ---------------------------------------------------------------------------
// emailSchema tests
// ---------------------------------------------------------------------------
describe('emailSchema (Login)', () => {
  it('accepts a valid e-mail', () => {
    expect(emailSchema.safeParse('user@cca.pt').success).toBe(true);
  });

  it('accepts e-mail with subdomain', () => {
    expect(emailSchema.safeParse('admin@mail.cca-law.com').success).toBe(true);
  });

  it('rejects plain text (no @)', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false);
  });

  it('rejects e-mail missing domain', () => {
    expect(emailSchema.safeParse('user@').success).toBe(false);
  });

  it('rejects e-mail missing local part', () => {
    expect(emailSchema.safeParse('@cca.pt').success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('returns the custom error message on failure', () => {
    const result = emailSchema.safeParse('bad-input');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Por favor, introduza um e-mail válido');
    }
  });
});

// ---------------------------------------------------------------------------
// passwordSchema tests
// ---------------------------------------------------------------------------
describe('passwordSchema (Login)', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('StrongPass1!').success).toBe(true);
  });

  it('accepts minimal valid password (8 chars, mixed case + digit)', () => {
    expect(passwordSchema.safeParse('Aa1bbbbb').success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = passwordSchema.safeParse('Aa1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('8 caracteres'))).toBe(true);
    }
  });

  it('rejects password without uppercase letter', () => {
    const result = passwordSchema.safeParse('lowercase1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('maiúscula'))).toBe(true);
    }
  });

  it('rejects password without lowercase letter', () => {
    const result = passwordSchema.safeParse('UPPERCASE1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('minúscula'))).toBe(true);
    }
  });

  it('rejects password without a number', () => {
    const result = passwordSchema.safeParse('NoNumbersHere');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('número'))).toBe(true);
    }
  });

  it('rejects empty password', () => {
    expect(passwordSchema.safeParse('').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contratoFormSchema tests — required fields
// ---------------------------------------------------------------------------
describe('contratoFormSchema — required fields', () => {
  const validBase = {
    titulo_contrato: 'Contrato de Prestação de Serviços',
    tipo_contrato: 'prestacao_servicos',
    departamento_responsavel: 'juridico',
    parte_a_nome_legal: 'CCA — Sociedade de Advogados, Lda.',
    parte_b_nome_legal: 'Fornecedor, S.A.',
  };

  it('accepts a valid minimal form (all required fields filled)', () => {
    const result = contratoFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects when titulo_contrato is empty', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, titulo_contrato: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('titulo_contrato'))).toBe(true);
    }
  });

  it('rejects when tipo_contrato is empty', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, tipo_contrato: '' });
    expect(result.success).toBe(false);
  });

  it('rejects when departamento_responsavel is empty', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, departamento_responsavel: '' });
    expect(result.success).toBe(false);
  });

  it('rejects when parte_a_nome_legal is empty', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, parte_a_nome_legal: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('parte_a_nome_legal'))).toBe(true);
    }
  });

  it('rejects when parte_b_nome_legal is empty', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, parte_b_nome_legal: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contratoFormSchema tests — defaults
// ---------------------------------------------------------------------------
describe('contratoFormSchema — defaults', () => {
  const validBase = {
    titulo_contrato: 'Contrato de Teste',
    tipo_contrato: 'nda',
    departamento_responsavel: 'comercial',
    parte_a_nome_legal: 'Empresa A',
    parte_b_nome_legal: 'Empresa B',
  };

  it('defaults parte_a_pais to Portugal', () => {
    const result = contratoFormSchema.safeParse(validBase);
    if (result.success) expect(result.data.parte_a_pais).toBe('Portugal');
  });

  it('defaults parte_b_pais to Portugal', () => {
    const result = contratoFormSchema.safeParse(validBase);
    if (result.success) expect(result.data.parte_b_pais).toBe('Portugal');
  });

  it('defaults tratamento_dados_pessoais to false', () => {
    const result = contratoFormSchema.safeParse(validBase);
    if (result.success) expect(result.data.tratamento_dados_pessoais).toBe(false);
  });

  it('defaults tipo_duracao to prazo_determinado', () => {
    const result = contratoFormSchema.safeParse(validBase);
    if (result.success) expect(result.data.tipo_duracao).toBe('prazo_determinado');
  });

  it('defaults aviso_previo_nao_renovacao_dias to 30', () => {
    const result = contratoFormSchema.safeParse(validBase);
    if (result.success) expect(result.data.aviso_previo_nao_renovacao_dias).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// contratoFormSchema tests — optional fields
// ---------------------------------------------------------------------------
describe('contratoFormSchema — optional fields', () => {
  const validBase = {
    titulo_contrato: 'Contrato',
    tipo_contrato: 'saas',
    departamento_responsavel: 'it',
    parte_a_nome_legal: 'Empresa A',
    parte_b_nome_legal: 'Empresa B',
  };

  it('accepts null data_termo', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, data_termo: null });
    expect(result.success).toBe(true);
  });

  it('accepts a Date for data_termo', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, data_termo: new Date('2025-12-31') });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.data_termo).toBeInstanceOf(Date);
  });

  it('accepts null garantia_valor', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, garantia_valor: null });
    expect(result.success).toBe(true);
  });

  it('accepts a positive number for garantia_valor', () => {
    const result = contratoFormSchema.safeParse({ ...validBase, garantia_valor: 50000 });
    expect(result.success).toBe(true);
  });

  it('accepts undefined objeto_resumido', () => {
    const result = contratoFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.objeto_resumido).toBeUndefined();
  });
});
