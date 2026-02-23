export interface WidgetConfig {
  id: string;
  type: WidgetType;
  order: number;
  visible: boolean;
  title: string;
  config: Record<string, unknown>;
}

export type WidgetType = 
  | 'ORGANIZATION_CARD'
  | 'LAWYER_CARD'
  | 'CCA_NEWS'
  | 'RECENT_CONTRACTS'
  | 'RECENT_DOCUMENTS'
  | 'EXPIRING_CONTRACTS'
  | 'QUICK_LINKS'
  | 'WELCOME_MESSAGE'
  | 'LEGAL_INSIGHTS';

export interface HomeLayout {
  widgets: WidgetConfig[];
  schemaVersion: number;
}

export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  widgets: [
    {
      id: 'default-welcome',
      type: 'WELCOME_MESSAGE',
      order: 0,
      visible: true,
      title: 'Bem-vindo',
      config: {
        contentBlockKey: 'welcome_message',
      },
    },
    {
      id: 'default-org',
      type: 'ORGANIZATION_CARD',
      order: 1,
      visible: true,
      title: 'A Nossa Organização',
      config: {
        showLogo: true,
      },
    },
    {
      id: 'default-lawyer',
      type: 'LAWYER_CARD',
      order: 2,
      visible: true,
      title: 'Advogado Associado',
      config: {},
    },
    {
      id: 'default-news',
      type: 'CCA_NEWS',
      order: 3,
      visible: true,
      title: 'Novidades',
      config: {
        limit: 3,
        showDate: true,
      },
    },
    {
      id: 'default-contracts',
      type: 'RECENT_CONTRACTS',
      order: 4,
      visible: true,
      title: 'Contratos Recentes',
      config: {
        limit: 5,
        showStatus: true,
      },
    },
    {
      id: 'default-documents',
      type: 'RECENT_DOCUMENTS',
      order: 5,
      visible: true,
      title: 'Documentos Recentes',
      config: {
        limit: 5,
        showDate: true,
      },
    },
    {
      id: 'default-expiring',
      type: 'EXPIRING_CONTRACTS',
      order: 6,
      visible: true,
      title: 'Contratos a Expirar',
      config: {
        daysAhead: 30,
      },
    },
    {
      id: 'default-links',
      type: 'QUICK_LINKS',
      order: 7,
      visible: true,
      title: 'Atalhos Rápidos',
      config: {
        links: [
          { label: 'Contratos', path: '/contratos', icon: 'FileText' },
          { label: 'Documentos', path: '/documentos', icon: 'Folder' },
          { label: 'Eventos', path: '/eventos', icon: 'Calendar' },
          { label: 'Normativos', path: '/normativos', icon: 'Scale' },
        ],
      },
    },
  ],
  schemaVersion: 1,
};

export interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  description: string;
  /** Setores onde este widget é mais relevante (opcional) */
  requiredSectors?: string[];
}

export const WIDGET_TYPES: WidgetTypeInfo[] = [
  {
    type: 'ORGANIZATION_CARD',
    label: 'Cartão da Organização',
    description: 'Mostra nome e logo da organização',
  },
  {
    type: 'LAWYER_CARD',
    label: 'Advogado Associado',
    description: 'Mostra o advogado responsável',
  },
  {
    type: 'CCA_NEWS',
    label: 'Novidades',
    description: 'Últimas notícias publicadas',
  },
  {
    type: 'RECENT_CONTRACTS',
    label: 'Contratos Recentes',
    description: 'Lista dos contratos mais recentes',
  },
  {
    type: 'RECENT_DOCUMENTS',
    label: 'Documentos Recentes',
    description: 'Lista dos documentos mais recentes',
  },
  {
    type: 'EXPIRING_CONTRACTS',
    label: 'Contratos a Expirar',
    description: 'Contratos próximos da data de termo',
  },
  {
    type: 'QUICK_LINKS',
    label: 'Atalhos Rápidos',
    description: 'Links para secções da plataforma',
  },
  {
    type: 'WELCOME_MESSAGE',
    label: 'Mensagem de Boas-vindas',
    description: 'Texto personalizado de boas-vindas',
  },
  {
    type: 'LEGAL_INSIGHTS',
    label: 'Legal Insights',
    description: 'Últimas alterações legislativas',
    requiredSectors: ['servicos_financeiros', 'legal', 'saude_farmaceutica', 'seguros_resseguros'],
  },
];
