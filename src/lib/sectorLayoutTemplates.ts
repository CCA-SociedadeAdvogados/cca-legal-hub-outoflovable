import { HomeLayout, WidgetConfig } from './defaultHomeLayout';

/**
 * Templates de layout por setor de atividade.
 * Quando uma organização não tem layout personalizado,
 * usa-se o template do seu setor primário.
 */

// Helper para criar widgets com IDs únicos por setor
function createWidget(
  sector: string,
  type: WidgetConfig['type'],
  order: number,
  title: string,
  config: Record<string, unknown> = {}
): WidgetConfig {
  return {
    id: `${sector}-${type.toLowerCase()}-${order}`,
    type,
    order,
    visible: true,
    title,
    config,
  };
}

// Template para Serviços Financeiros
// Foco: Compliance, Legal Insights, Contratos a Expirar
const servicosFinanceirosLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('fin', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('fin', 'LEGAL_INSIGHTS', 1, 'Alterações Regulatórias', {}),
    createWidget('fin', 'EXPIRING_CONTRACTS', 2, 'Contratos a Expirar', { daysAhead: 60 }),
    createWidget('fin', 'ORGANIZATION_CARD', 3, 'A Nossa Organização', { showLogo: true }),
    createWidget('fin', 'RECENT_CONTRACTS', 4, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('fin', 'LAWYER_CARD', 5, 'Advogado Associado', {}),
    createWidget('fin', 'CCA_NEWS', 6, 'Novidades', { limit: 3, showDate: true }),
    createWidget('fin', 'QUICK_LINKS', 7, 'Atalhos Rápidos', {
      links: [
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Legal Insights', path: '/eventos', icon: 'Scale' },
        { label: 'Requisitos', path: '/requisitos', icon: 'ClipboardCheck' },
        { label: 'Impactos', path: '/impactos', icon: 'AlertTriangle' },
      ],
    }),
  ],
};

// Template para Saúde & Farmacêutica
// Foco: Documentação, Normativos, Compliance
const saudeFarmaceuticaLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('sau', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('sau', 'LEGAL_INSIGHTS', 1, 'Alterações Legislativas', {}),
    createWidget('sau', 'RECENT_DOCUMENTS', 2, 'Documentos Recentes', { limit: 5, showDate: true }),
    createWidget('sau', 'ORGANIZATION_CARD', 3, 'A Nossa Organização', { showLogo: true }),
    createWidget('sau', 'EXPIRING_CONTRACTS', 4, 'Contratos a Expirar', { daysAhead: 30 }),
    createWidget('sau', 'RECENT_CONTRACTS', 5, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('sau', 'LAWYER_CARD', 6, 'Advogado Associado', {}),
    createWidget('sau', 'CCA_NEWS', 7, 'Novidades', { limit: 3, showDate: true }),
    createWidget('sau', 'QUICK_LINKS', 8, 'Atalhos Rápidos', {
      links: [
        { label: 'Documentos', path: '/documentos', icon: 'Folder' },
        { label: 'Normativos', path: '/normativos', icon: 'Scale' },
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Políticas', path: '/politicas', icon: 'Shield' },
      ],
    }),
  ],
};

// Template para Setor Público
// Foco: Requisitos, Contratos, Transparência
const setorPublicoLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('pub', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('pub', 'ORGANIZATION_CARD', 1, 'A Nossa Organização', { showLogo: true }),
    createWidget('pub', 'EXPIRING_CONTRACTS', 2, 'Contratos a Expirar', { daysAhead: 90 }),
    createWidget('pub', 'RECENT_CONTRACTS', 3, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('pub', 'LEGAL_INSIGHTS', 4, 'Alterações Legislativas', {}),
    createWidget('pub', 'CCA_NEWS', 5, 'Novidades', { limit: 3, showDate: true }),
    createWidget('pub', 'LAWYER_CARD', 6, 'Advogado Associado', {}),
    createWidget('pub', 'QUICK_LINKS', 7, 'Atalhos Rápidos', {
      links: [
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Requisitos', path: '/requisitos', icon: 'ClipboardCheck' },
        { label: 'Auditoria', path: '/auditoria', icon: 'Search' },
        { label: 'Documentos', path: '/documentos', icon: 'Folder' },
      ],
    }),
  ],
};

// Template para Legal
// Foco: Legal Insights, Contratos, Normativos
const legalLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('leg', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('leg', 'LEGAL_INSIGHTS', 1, 'Legal Insights', {}),
    createWidget('leg', 'RECENT_CONTRACTS', 2, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('leg', 'RECENT_DOCUMENTS', 3, 'Documentos Recentes', { limit: 5, showDate: true }),
    createWidget('leg', 'ORGANIZATION_CARD', 4, 'A Nossa Organização', { showLogo: true }),
    createWidget('leg', 'EXPIRING_CONTRACTS', 5, 'Contratos a Expirar', { daysAhead: 30 }),
    createWidget('leg', 'LAWYER_CARD', 6, 'Advogado Associado', {}),
    createWidget('leg', 'CCA_NEWS', 7, 'Novidades', { limit: 3, showDate: true }),
    createWidget('leg', 'QUICK_LINKS', 8, 'Atalhos Rápidos', {
      links: [
        { label: 'Legal Insights', path: '/eventos', icon: 'Scale' },
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Normativos', path: '/normativos', icon: 'BookOpen' },
        { label: 'Templates', path: '/templates', icon: 'FileCode' },
      ],
    }),
  ],
};

// Template para Seguros & Resseguros
// Similar a Serviços Financeiros
const segurosLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('seg', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('seg', 'LEGAL_INSIGHTS', 1, 'Alterações Regulatórias', {}),
    createWidget('seg', 'EXPIRING_CONTRACTS', 2, 'Contratos a Expirar', { daysAhead: 60 }),
    createWidget('seg', 'ORGANIZATION_CARD', 3, 'A Nossa Organização', { showLogo: true }),
    createWidget('seg', 'RECENT_CONTRACTS', 4, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('seg', 'RECENT_DOCUMENTS', 5, 'Documentos Recentes', { limit: 5, showDate: true }),
    createWidget('seg', 'LAWYER_CARD', 6, 'Advogado Associado', {}),
    createWidget('seg', 'CCA_NEWS', 7, 'Novidades', { limit: 3, showDate: true }),
    createWidget('seg', 'QUICK_LINKS', 8, 'Atalhos Rápidos', {
      links: [
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Legal Insights', path: '/eventos', icon: 'Scale' },
        { label: 'Impactos', path: '/impactos', icon: 'AlertTriangle' },
        { label: 'Políticas', path: '/politicas', icon: 'Shield' },
      ],
    }),
  ],
};

// Template para Tecnologias de Informação
// Foco: Proteção de dados, Contratos tech
const tecnologiasLayout: HomeLayout = {
  schemaVersion: 1,
  widgets: [
    createWidget('tec', 'WELCOME_MESSAGE', 0, 'Bem-vindo', { contentBlockKey: 'welcome_message' }),
    createWidget('tec', 'ORGANIZATION_CARD', 1, 'A Nossa Organização', { showLogo: true }),
    createWidget('tec', 'RECENT_CONTRACTS', 2, 'Contratos Recentes', { limit: 5, showStatus: true }),
    createWidget('tec', 'EXPIRING_CONTRACTS', 3, 'Contratos a Expirar', { daysAhead: 30 }),
    createWidget('tec', 'LEGAL_INSIGHTS', 4, 'Alterações Legislativas', {}),
    createWidget('tec', 'RECENT_DOCUMENTS', 5, 'Documentos Recentes', { limit: 5, showDate: true }),
    createWidget('tec', 'CCA_NEWS', 6, 'Novidades', { limit: 3, showDate: true }),
    createWidget('tec', 'LAWYER_CARD', 7, 'Advogado Associado', {}),
    createWidget('tec', 'QUICK_LINKS', 8, 'Atalhos Rápidos', {
      links: [
        { label: 'Contratos', path: '/contratos', icon: 'FileText' },
        { label: 'Documentos', path: '/documentos', icon: 'Folder' },
        { label: 'Legal Insights', path: '/eventos', icon: 'Scale' },
        { label: 'Políticas', path: '/politicas', icon: 'Shield' },
      ],
    }),
  ],
};

/**
 * Mapeamento de setores para layouts
 */
export const SECTOR_LAYOUT_TEMPLATES: Record<string, HomeLayout> = {
  servicos_financeiros: servicosFinanceirosLayout,
  saude_farmaceutica: saudeFarmaceuticaLayout,
  setor_publico: setorPublicoLayout,
  legal: legalLayout,
  seguros_resseguros: segurosLayout,
  tecnologias_informacao: tecnologiasLayout,
};

/**
 * Obtém o layout template para um setor específico
 * @param sector O identificador do setor
 * @returns O layout template ou null se não existir
 */
export function getLayoutForSector(sector: string | null): HomeLayout | null {
  if (!sector) return null;
  return SECTOR_LAYOUT_TEMPLATES[sector] || null;
}

/**
 * Verifica se um setor tem layout template definido
 * @param sector O identificador do setor
 * @returns true se existe template para o setor
 */
export function hasSectorTemplate(sector: string | null): boolean {
  if (!sector) return false;
  return sector in SECTOR_LAYOUT_TEMPLATES;
}

/**
 * Lista todos os setores com templates disponíveis
 * @returns Array com os identificadores dos setores
 */
export function getSectorsWithTemplates(): string[] {
  return Object.keys(SECTOR_LAYOUT_TEMPLATES);
}
