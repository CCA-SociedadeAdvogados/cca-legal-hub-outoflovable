// CCA Legal Hub — real data based on reference screens
// Sidebar order preserved from original

const NAV = [
  { id: 'inicio', icon: 'home', label: 'Início' },
  { id: 'notificacoes', icon: 'bell', label: 'Notificações' },
  { id: 'conta', icon: 'wallet', label: 'Minha Conta Corrente' },
  { id: 'legalbi', icon: 'chart', label: 'LegalBI' },
  { id: 'contratos', icon: 'doc', label: 'Meus Contratos', chevron: true },
  { id: 'documentos', icon: 'folder', label: 'Documentos' },
  { id: 'insights', icon: 'spark', label: 'Legal Insights' },
  { id: 'novidades', icon: 'news', label: 'Novidades CCA' },
  { id: 'politicas', icon: 'shield', label: 'Políticas' },
  { id: 'impostos', icon: 'coin', label: 'Impostos', locked: true },
  { id: 'legislacao', icon: 'book', label: 'Legislação & Jurisp.', locked: true },
  { id: 'utilizadores', icon: 'users', label: 'Utilizadores' },
  { id: 'organizacao', icon: 'building', label: 'Organização' },
];

const NAV_SECONDARY = [
  { id: 'escuro', icon: 'moon', label: 'Modo Escuro' },
  { id: 'admin', icon: 'gear', label: 'Administração' },
  { id: 'defs', icon: 'sliders', label: 'Definições' },
  { id: 'logout', icon: 'logout', label: 'Terminar sessão' },
  { id: 'collapse', icon: 'collapse', label: 'Recolher' },
];

const CONTRACTS = [
  { id: 'RENEW-001', title: 'AUTO RENEWAL ORDER FORM | DOCUSIGN', vendor: 'DocuSign International (EMEA) Limited', status: 'Activo', renews: '12 Jun 2026', value: '€ 48.200' },
  { id: 'SPA-0274', title: 'Order and Sale Agreement R074267 CCA Intapp, Inc.', vendor: 'Integration Appliance, Inc. (Intapp)', status: 'Activo', renews: '03 Set 2026', value: '€ 124.500' },
  { id: 'MSA-0189', title: 'Master Services Agreement — Microsoft Portugal', vendor: 'Microsoft Portugal, S.A.', status: 'Activo', renews: '28 Abr 2026', value: '€ 86.700' },
  { id: 'NDA-0412', title: 'Mutual NDA — Deloitte Consulting', vendor: 'Deloitte Consultores, S.A.', status: 'Em revisão', renews: '—', value: '—' },
  { id: 'SUB-0038', title: 'LexisNexis Enterprise Subscription', vendor: 'LexisNexis Portugal, Lda.', status: 'Activo', renews: '15 Jul 2026', value: '€ 22.100' },
];

const DOCUMENTS = [
  { id: 'D-1034', title: 'Parecer fiscal Q1 2026', folder: 'Fiscalidade', updated: 'há 2 h', author: 'Dra. Helena Cunha', size: '2.4 MB' },
  { id: 'D-1029', title: 'Ata Assembleia Geral — Abr 2026', folder: 'Corporate', updated: 'ontem', author: 'Dr. Rafael Campos', size: '1.1 MB' },
  { id: 'D-1024', title: 'Due diligence — Projecto Aurora', folder: 'M&A', updated: 'há 3 dias', author: 'Dra. Beatriz Andrade', size: '18.7 MB' },
  { id: 'D-1018', title: 'Minuta — Contrato de prestação de serviços', folder: 'Contratos', updated: 'há 5 dias', author: 'Dr. Gustavo Teixeira', size: '480 KB' },
];

const INSIGHTS = [
  { cat: 'Fiscalidade', title: 'Reforma do IRC: impactos nas holdings familiares em 2026', date: '12 Abr 2026', read: '8 min', featured: true },
  { cat: 'Regulatório', title: 'Nova regulação da ANACOM e o mercado de telecomunicações', date: '04 Abr 2026', read: '6 min' },
  { cat: 'M&A', title: 'Cláusulas MAC em contratos pós-pandemia', date: '28 Mar 2026', read: '12 min' },
  { cat: 'Compliance', title: 'DORA: o que muda para as empresas portuguesas', date: '22 Mar 2026', read: '10 min' },
];

const NEWS_CCA = [
  { date: '18 Abr', title: 'CCA premiada como "Best Tax Firm 2026" pela Chambers Europe', tag: 'Prémio' },
  { date: '11 Abr', title: 'Nova parceria com escritório em Madrid', tag: 'Expansão' },
  { date: '02 Abr', title: 'CCA Talks: Reforma Tributária — registo aberto', tag: 'Evento' },
];

const KPIS = [
  { label: 'Contratos activos', value: '23', delta: '+2', trend: 'up' },
  { label: 'A expirar em 30 dias', value: '3', delta: 'atenção', trend: 'warn' },
  { label: 'Documentos novos', value: '12', delta: '+5', trend: 'up' },
  { label: 'Saldo em conta', value: '€ 14.280', delta: '—', trend: 'flat' },
];

const RECENT_ACTIVITY = [
  { type: 'doc', who: 'Dra. Helena Cunha', what: 'carregou', obj: 'Parecer fiscal Q1 2026', when: 'há 2 h' },
  { type: 'contract', who: 'Sistema', what: 'aprovou', obj: 'Renovação DocuSign', when: 'há 4 h' },
  { type: 'message', who: 'Dr. Rafael Campos', what: 'enviou mensagem sobre', obj: 'Projecto Aurora', when: 'ontem' },
  { type: 'news', who: 'CCA', what: 'publicou', obj: 'Legal Insight sobre reforma do IRC', when: 'ontem' },
];

window.CCA = { NAV, NAV_SECONDARY, CONTRACTS, DOCUMENTS, INSIGHTS, NEWS_CCA, KPIS, RECENT_ACTIVITY };
