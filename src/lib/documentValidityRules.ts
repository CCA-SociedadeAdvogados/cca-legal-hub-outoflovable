import { differenceInDays, addDays, addYears } from 'date-fns';

/**
 * Document types recognized by the validity engine.
 * Maps to the `name` field from `document_checklist_types`.
 */
export type DocumentCategory =
  | 'certidao_permanente'
  | 'rcbe'
  | 'documento_identificacao'
  | 'comprovativo_morada'
  | 'certidao_at'
  | 'certidao_seguranca_social'
  | 'outro';

/**
 * Validity status for a document.
 */
export type ValidityStatus = 'valid' | 'expiring_soon' | 'expired' | 'advisory';

export interface ValidityResult {
  status: ValidityStatus;
  expiryDate: Date | null;
  daysRemaining: number | null;
  advisory: string | null;
}

// Keywords used to classify documents by name (PT)
const CATEGORY_KEYWORDS: Record<DocumentCategory, string[]> = {
  certidao_permanente: ['certidão permanente', 'certidao permanente'],
  rcbe: ['rcbe', 'registo central beneficiário', 'registo central do beneficiário', 'beneficiário efectivo'],
  documento_identificacao: ['cartão cidadão', 'cartao cidadao', 'cc', 'bilhete de identidade', 'bi', 'passaporte', 'documento de identificação', 'documento identificacao', 'título de residência'],
  comprovativo_morada: ['comprovativo de morada', 'comprovativo morada', 'prova de morada', 'prova morada'],
  certidao_at: ['certidão at', 'certidao at', 'não dívida at', 'nao divida at', 'autoridade tributária', 'finanças', 'financas', 'certidão tributária'],
  certidao_seguranca_social: ['segurança social', 'seguranca social', 'não dívida segurança', 'nao divida seguranca', 'certidão ss'],
  outro: [],
};

/**
 * Classifies a document name into a category.
 */
export function classifyDocument(name: string): DocumentCategory {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nameNorm = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [DocumentCategory, string[]][]) {
    if (category === 'outro') continue;
    for (const kw of keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(kwNorm) || nameNorm.includes(kw)) {
        return category;
      }
    }
  }
  return 'outro';
}

/**
 * Calculates the effective expiry date for a document type given its emission date.
 * If the document has an explicit validity date (e.g. ID card), use that instead.
 */
export function calculateEffectiveExpiry(
  category: DocumentCategory,
  emissionDate: Date | null,
  explicitValidityDate: Date | null,
): Date | null {
  switch (category) {
    case 'certidao_permanente':
    case 'rcbe':
      // Valid for 1 year after emission
      return emissionDate ? addYears(emissionDate, 1) : explicitValidityDate;

    case 'documento_identificacao':
      // Use the explicit validity date on the document
      return explicitValidityDate;

    case 'comprovativo_morada':
    case 'certidao_at':
    case 'certidao_seguranca_social':
      // No fixed legal validity — practical 90-day recommendation from emission
      return emissionDate ? addDays(emissionDate, 90) : explicitValidityDate;

    default:
      return explicitValidityDate;
  }
}

/**
 * Returns an advisory message for document types without a fixed legal validity.
 */
export function getAdvisoryMessage(
  category: DocumentCategory,
  lang: 'pt' | 'en' = 'pt',
): string | null {
  const advisories: Record<string, Record<string, string>> = {
    comprovativo_morada: {
      pt: 'Bancos e autoridades normalmente exigem documentos emitidos há, no máximo, 90 dias.',
      en: 'Banks and authorities typically require documents issued within the last 90 days.',
    },
    certidao_at: {
      pt: 'Na prática, bancos e autoridades tendem a exigir documentos emitidos há, no máximo, 90 dias.',
      en: 'In practice, banks and authorities tend to require documents issued within the last 90 days.',
    },
    certidao_seguranca_social: {
      pt: 'Na prática, bancos e autoridades tendem a exigir documentos emitidos há, no máximo, 90 dias.',
      en: 'In practice, banks and authorities tend to require documents issued within the last 90 days.',
    },
  };

  return advisories[category]?.[lang] ?? null;
}

/**
 * Evaluates the validity of a document.
 */
export function evaluateDocumentValidity(
  category: DocumentCategory,
  emissionDate: Date | null,
  explicitValidityDate: Date | null,
  lang: 'pt' | 'en' = 'pt',
): ValidityResult {
  const expiryDate = calculateEffectiveExpiry(category, emissionDate, explicitValidityDate);
  const advisory = getAdvisoryMessage(category, lang);
  const now = new Date();

  if (!expiryDate) {
    return {
      status: advisory ? 'advisory' : 'valid',
      expiryDate: null,
      daysRemaining: null,
      advisory,
    };
  }

  const daysRemaining = differenceInDays(expiryDate, now);
  const isAdvisoryCategory = ['comprovativo_morada', 'certidao_at', 'certidao_seguranca_social'].includes(category);

  if (daysRemaining < 0) {
    return {
      status: isAdvisoryCategory ? 'advisory' : 'expired',
      expiryDate,
      daysRemaining,
      advisory: isAdvisoryCategory ? advisory : null,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: isAdvisoryCategory ? 'advisory' : 'expiring_soon',
      expiryDate,
      daysRemaining,
      advisory: isAdvisoryCategory ? advisory : null,
    };
  }

  return {
    status: 'valid',
    expiryDate,
    daysRemaining,
    advisory,
  };
}
