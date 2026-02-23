// User Roles
export type UserRole = 'ADMIN_JURIDICO' | 'CLIENTE_ADMIN' | 'CLIENTE_COLABORADOR';

// Risk Levels
export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAIXO';

// Status Types
export type RegulatoryEventStatus = 'RASCUNHO' | 'ACTIVO' | 'REVOGADO';
export type ContractStatus = 'RASCUNHO' | 'VIGENTE' | 'EXPIRADO' | 'RESCINDIDO';
export type ImpactStatus = 'PENDENTE_ANALISE' | 'EM_TRATAMENTO' | 'CONCLUIDO';
export type DocumentType = 'POLITICA_INTERNA' | 'CONTRATO' | 'ADENDA';
export type LifecycleEventType = 'ASSINATURA' | 'RENOVACAO' | 'ADENDA' | 'RESCISAO' | 'NOTA_INTERNA';

// Jurisdiction and Legal Areas
export type Jurisdiction = 'Portugal' | 'UE' | 'Internacional';
export type LegalArea = 
  | 'Laboral' 
  | 'Cibersegurança' 
  | 'Protecção de Dados' 
  | 'Financeiro' 
  | 'Ambiental' 
  | 'Fiscal' 
  | 'Comercial' 
  | 'Contratual'
  | 'Societário';

// Contract Types
export type ContractType = 
  | 'Contrato de Trabalho'
  | 'Contrato de Prestação de Serviços'
  | 'Contrato de Prestação de Serviços TI'
  | 'Contrato de Fornecedor'
  | 'Contrato de Licenciamento'
  | 'Contrato de Parceria'
  | 'Acordo de Confidencialidade'
  | 'Contrato de Arrendamento'
  | 'Outro';

// User Interface
export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  clientId: string | null;
  ativo: boolean;
  createdAt: Date;
}

// Client Interface
export interface Client {
  id: string;
  nome: string;
  nif: string;
  sector: string;
  pais: string;
  numeroTrabalhadores: number;
  infoAdicional?: string;
  subdominioOpcional?: string;
  createdAt: Date;
}

// Regulatory Event Interface
export interface RegulatoryEvent {
  id: string;
  titulo: string;
  referenciaLegal: string;
  descricaoResumo: string;
  jurisdicao: Jurisdiction;
  areaDireito: LegalArea;
  dataPublicacao: Date;
  dataEntradaVigor: Date;
  linkOficial?: string;
  estado: RegulatoryEventStatus;
  createdAt: Date;
}

// Requirement Interface
export interface Requirement {
  id: string;
  regulatoryEventId: string;
  titulo: string;
  descricao: string;
  risco: RiskLevel;
  tiposEntidadeAlvo: string;
}

// Clause Template Interface
export interface ClauseTemplate {
  id: string;
  titulo: string;
  areaDireito: LegalArea;
  tipoContratoAlvo: ContractType;
  textoModelo: string;
}

// Document Template Interface
export interface DocumentTemplate {
  id: string;
  nome: string;
  tipoDocumento: DocumentType;
  areaDireito: LegalArea;
  textoModelo: string;
}

// Contract Interface
export interface Contract {
  id: string;
  clientId: string;
  titulo: string;
  tipoContrato: ContractType;
  dataAssinatura: Date;
  dataInicioVigencia?: Date;
  dataFimPrevista?: Date;
  valorContrato: number;
  moeda: string;
  estadoContrato: ContractStatus;
  renovacaoAutomatica: boolean;
  periodicidadeRenovacaoMeses?: number;
  textoIntegral?: string;
  tags: string[];
  responsavelInternoId?: string;
  camposAdicionais?: Record<string, unknown>;
  createdAt: Date;
}

// Contract Lifecycle Record Interface
export interface ContractLifecycleRecord {
  id: string;
  contractId: string;
  tipoEvento: LifecycleEventType;
  dataEvento: Date;
  descricao: string;
  criadoPorUserId: string;
}

// Policy Interface
export interface Policy {
  id: string;
  clientId: string;
  nome: string;
  tipo: string;
  textoIntegral: string;
  tags: string[];
  createdAt: Date;
}

// Impact Record Interface
export interface ImpactRecord {
  id: string;
  clientId: string;
  regulatoryEventId: string;
  contractId?: string;
  policyId?: string;
  requirementId?: string;
  nivelRisco: RiskLevel;
  estado: ImpactStatus;
  observacoes?: string;
  responsavelId?: string;
  createdAt: Date;
}

// Generated Document Interface
export interface GeneratedDocument {
  id: string;
  clientId: string;
  contractId?: string;
  policyId?: string;
  regulatoryEventId?: string;
  documentTemplateId: string;
  titulo: string;
  tipoDocumento: DocumentType;
  conteudoGerado: string;
  dataCriacao: Date;
}

// Alert Interface (for proactive notifications)
export interface Alert {
  id: string;
  type: 'contract_expiry' | 'auto_renewal' | 'regulatory_impact' | 'pending_analysis';
  title: string;
  description: string;
  severity: RiskLevel;
  relatedId: string;
  relatedType: 'contract' | 'policy' | 'regulatory_event' | 'impact_record';
  dueDate?: Date;
  createdAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalContracts: number;
  totalPolicies: number;
  pendingImpacts: number;
  highRiskImpacts: number;
  expiringContracts: number;
  totalContractValue: number;
}
