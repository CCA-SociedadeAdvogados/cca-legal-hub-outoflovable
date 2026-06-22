/**
 * Centralized query key factory for TanStack React Query.
 *
 * Usage:
 *   import { queryKeys } from '@/lib/queryKeys';
 *   useQuery({ queryKey: queryKeys.contratos.all(orgId), ... })
 *
 * Every key used in the codebase is catalogued here so invalidation
 * and cache management stay consistent across hooks, pages and components.
 */

export const queryKeys = {
  // ── Contratos ──────────────────────────────────────────────
  contratos: {
    all: (orgId: string) => ['contratos', orgId] as const,
    detail: (id: string) => ['contrato', id] as const,
    orgCliente: (orgId: string) => ['contratos-org-cliente', orgId] as const,
  },

  // ── Contract sub-resources ─────────────────────────────────
  contractExtractions: {
    byContrato: (contratoId: string) => ['contract-extractions', contratoId] as const,
  },
  contractTriage: {
    byContrato: (contratoId: string) => ['contract-triage', contratoId] as const,
  },
  contractComplianceAnalysis: {
    byContrato: (contratoId: string) => ['contract-compliance-analysis', contratoId] as const,
  },
  contratoNormativos: {
    byContrato: (contratoId: string) => ['contrato-normativos', contratoId] as const,
  },
  executiveSummary: {
    byContract: (contractId: string) => ['executive-summary', contractId] as const,
  },
  clientAnalysis: {
    byContract: (contractId: string) => ['client-analysis', contractId] as const,
  },
  redline: {
    byContract: (contractId: string) => ['redline', contractId] as const,
  },
  anexos: {
    byContrato: (contratoId: string) => ['anexos', contratoId] as const,
  },
  eventos: {
    byContrato: (contratoId: string) => ['eventos', contratoId] as const,
    all: () => ['eventos'] as const,
  },

  // ── Profile ────────────────────────────────────────────────
  profile: {
    byUser: (userId: string) => ['profile', userId] as const,
  },
  azureProfilePhoto: {
    byUser: (userId: string) => ['azure-profile-photo', userId] as const,
  },
  lawyerProfile: {
    byOrg: (orgId: string) => ['lawyer-profile', orgId] as const,
  },

  // ── Organizations ──────────────────────────────────────────
  organizations: {
    byUser: (userId: string) => ['organizations', userId] as const,
    current: (userId: string) => ['current-organization', userId] as const,
    memberships: (userId: string) => ['user-memberships', userId] as const,
    members: (orgId: string) => ['organization-members', orgId] as const,
    settings: (orgId: string) => ['organization-settings', orgId] as const,
    sectors: (orgId: string) => ['organization-sectors', orgId] as const,
    subscription: (orgId: string) => ['organization-subscription', orgId] as const,
    clientCode: (orgId: string) => ['organization-client-code', orgId] as const,
    search: (term: string) => ['organization-search', term] as const,
  },

  // ── Eventos legislativos ───────────────────────────────────
  eventosLegislativos: {
    byOrg: (orgId: string) => ['eventos_legislativos', orgId] as const,
  },

  // ── Notifications ──────────────────────────────────────────
  notifications: {
    byUser: (userId: string) => ['notifications', userId] as const,
  },
  notificationPreferences: {
    byUser: (userId: string) => ['notification-preferences', userId] as const,
  },

  // ── Audit logs ─────────────────────────────────────────────
  auditLogs: {
    filtered: (...args: unknown[]) => ['audit_logs', ...args] as const,
  },
  authActivityLogs: {
    byUser: (userId: string) => ['auth-activity-logs', userId] as const,
  },

  // ── Feature flags ──────────────────────────────────────────
  featureFlags: {
    all: () => ['feature-flags'] as const,
    byName: (flagName: string) => ['feature-flag', flagName] as const,
  },

  // ── Content blocks & Home config ──────────────────────────
  contentBlocks: {
    byOrg: (orgId: string) => ['contentBlocks', orgId] as const,
  },
  homeConfig: {
    byOrg: (orgId: string) => ['homeConfig', orgId] as const,
  },

  // ── CCA access & clients ──────────────────────────────────
  ccaAccess: {
    authorized: (userId: string) => ['cca-internal-authorized', userId] as const,
    allOrganizations: () => ['cca-all-organizations'] as const,
    departmentOrganizations: (userId: string) => ['user-department-organizations', userId] as const,
    defaultClientOrg: () => ['cca-default-client-org'] as const,
  },
  ccaClients: {
    search: (term: string) => ['cca-client-search', term] as const,
    searchAll: (term: string) => ['cca-client-search', term, 'all'] as const,
  },
  ccaLawyers: {
    list: () => ['cca-lawyers-list'] as const,
  },
  ccaNews: {
    all: () => ['cca-news'] as const,
  },

  // ── Financial ──────────────────────────────────────────────
  financial: {
    summary: (userId: string, orgId: string) => ['financial-summary', userId, orgId] as const,
    items: (userId: string, orgId: string) => ['financial-items', userId, orgId] as const,
    byEntity: (userId: string, orgId: string) => ['financial-by-entity', userId, orgId] as const,
    orgInfo: (userId: string, orgId: string) =>
      ['organization-financial-info', userId, orgId] as const,
    navCache: () => ['financeiro-nav-cache'] as const,
    navItems: () => ['financeiro-nav-items'] as const,
    availableJvrisIds: (orgId: string) => ['available-jvris-ids', orgId] as const,
  },
  orgFicha: {
    byOrg: (orgId: string) => ['org-ficha', orgId] as const,
  },
  clientHome: {
    all: () => ['client-home'] as const,
  },
  invoices: {
    all: () => ['invoices'] as const,
  },
  clientFolders: {
    all: () => ['client-folders'] as const,
  },

  // ── SharePoint ─────────────────────────────────────────────
  sharePoint: {
    config: (orgId: string) => ['sharepoint-config', orgId] as const,
    documents: (orgId: string, folderPath?: string) =>
      folderPath
        ? (['sharepoint-documents', orgId, folderPath] as const)
        : (['sharepoint-documents', orgId] as const),
    syncLogs: (orgId: string, limit?: number) =>
      limit != null
        ? (['sharepoint-sync-logs', orgId, limit] as const)
        : (['sharepoint-sync-logs', orgId] as const),
    clientFolderEnsured: (orgId: string, folderPath: string) =>
      ['sharepoint-client-folder-ensured', orgId, folderPath] as const,
  },

  // ── Departments ────────────────────────────────────────────
  departments: {
    byOrg: (orgId: string) => ['departments', orgId] as const,
  },
  userDepartments: {
    byUserAndOrg: (userId: string, orgId: string) => ['user-departments', userId, orgId] as const,
  },
  deptMembers: {
    byDeptIds: (deptIds: string[]) => ['dept-members', deptIds] as const,
  },

  // ── Pedidos à CCA (on-demand requests) ─────────────────────
  pedidos: {
    byOrg: (orgId: string) => ['pedidos', orgId] as const,
  },

  // ── Assuntos / Processos (matter status) ───────────────────
  assuntos: {
    byOrg: (orgId: string) => ['assuntos', orgId] as const,
  },
  assuntoEventos: {
    byAssunto: (assuntoId: string) => ['assunto-eventos', assuntoId] as const,
  },

  // ── Compliance & Requisitos ────────────────────────────────
  requisitos: {
    byOrg: (orgId: string) => ['requisitos', orgId] as const,
  },
  impactos: {
    byOrg: (orgId: string) => ['impactos', orgId] as const,
  },

  // ── Templates ──────────────────────────────────────────────
  templates: {
    byOrg: (orgId: string) => ['templates', orgId] as const,
  },

  // ── GDPR / Consents ───────────────────────────────────────
  userConsents: {
    byUser: (userId: string) => ['user-consents', userId] as const,
  },
  dsarRequests: {
    byUser: (userId: string) => ['dsar-requests', userId] as const,
  },

  // ── Politicas ──────────────────────────────────────────────
  politicas: {
    byOrg: (orgId: string) => ['politicas', orgId] as const,
  },

  // ── Legal Mirror (Espelho Legal) ───────────────────────────
  legalMirror: {
    sources: () => ['legal-sources'] as const,
    documents: (query: string, sourceKey: string, limit: number, offset: number) =>
      ['legal-documents', query, sourceKey, limit, offset] as const,
    document: (id: string) => ['legal-document', id] as const,
  },

  // ── Documentos Gerados ─────────────────────────────────────
  documentosGerados: {
    byOrg: (orgId: string, modulo?: string) =>
      modulo
        ? (['documentos-gerados', orgId, modulo] as const)
        : (['documentos-gerados', orgId] as const),
  },

  // ── Document checklist ─────────────────────────────────────
  documentChecklist: {
    types: () => ['document-checklist-types'] as const,
    entries: (orgId: string) => ['document-checklist-entries', orgId] as const,
  },

  // ── Subscription plans ─────────────────────────────────────
  subscriptionPlans: {
    all: () => ['subscription-plans'] as const,
  },

  // ── Platform Admin ─────────────────────────────────────────
  platformAdmin: {
    isPlatformAdmin: (userId: string) => ['isPlatformAdmin', userId] as const,
    admins: () => ['platformAdmins'] as const,
    globalStats: () => ['globalStats'] as const,
    allOrganizations: () => ['allOrganizations'] as const,
    allContracts: () => ['allContracts'] as const,
    orgMembers: (orgId: string) => ['orgMembers', orgId] as const,
    impersonationHistory: () => ['impersonation-history'] as const,
  },

  // ── All Members (admin metrics) ───────────────────────────
  allMembersWithProfiles: {
    all: () => ['allMembersWithProfiles'] as const,
  },

  // ── Industry sectors ───────────────────────────────────────
  industrySectors: {
    effective: (orgId: string) => ['effective-industry-sectors', orgId] as const,
  },

  // ── Sidebar badges ────────────────────────────────────────
  sidebarBadges: {
    expiringContracts: () => ['expiring-contracts-badge'] as const,
    unreadNews: () => ['unread-news-badge'] as const,
  },

  // ── SSO admin emails ──────────────────────────────────────
  ssoAdminEmails: {
    all: () => ['sso-admin-emails'] as const,
  },

  // ── LegalBI ────────────────────────────────────────────────
  legalBi: {
    orgUrl: (orgId: string) => ['legalbi-org-url', orgId] as const,
  },
} as const;
