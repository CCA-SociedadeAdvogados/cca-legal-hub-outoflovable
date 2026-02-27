// Business Central — tipos partilhados entre Edge Functions e frontend

export interface BCCustomer {
  no: string;               // Nº do cliente em BC
  name: string;
  email: string | null;
  phoneNo: string | null;
  blocked: "" | "Ship" | "Invoice" | "All";
  creditLimit: number;
  balance: number;
  balanceDue: number;
  currency: string;
  paymentTermsCode: string | null;
  countryCode: string | null;
  address: string | null;
  city: string | null;
  postCode: string | null;
  lastModifiedDateTime: string;
}

export interface BCLedgerEntry {
  entryNo: number;
  customerNo: string;
  postingDate: string;           // ISO date "YYYY-MM-DD"
  documentType: "Invoice" | "Credit Memo" | "Payment" | "Finance Charge Memo" | "Reminder" | "Refund" | "";
  documentNo: string;
  description: string | null;
  amount: number;
  remainingAmount: number;
  open: boolean;
  dueDate: string | null;        // ISO date
  currency: string;
  externalDocumentNo: string | null;
}

export interface BCDashboardStats {
  totalCustomers: number;
  customersWithDebt: number;
  totalDebt: number;             // soma de remainingAmount de entradas abertas
  totalOverdue: number;          // soma de remainingAmount vencidas
  overdueEntries: number;        // contagem de entradas vencidas
}

// Payload enviado ao Power Automate Flow
export interface PAFlowRequest {
  action: "getCustomers" | "getLedgerEntries" | "getCustomerById";
  companyId: string;
  customerNo?: string;           // para getCustomerById / getLedgerEntries filtrado
  filter?: string;               // OData filter opcional
  top?: number;
  skip?: number;
}

// Resposta normalizada do Power Automate
export interface PAFlowResponse<T> {
  success: boolean;
  data: T[];
  totalCount?: number;
  error?: string;
}

// Entrada de cache em Supabase
export interface BCCacheEntry {
  id: string;
  cache_key: string;
  payload: unknown;
  expires_at: string;            // ISO timestamp
  created_at: string;
  updated_at: string;
}

// Parâmetros de pedido à Edge Function
export interface BCRequest {
  action: "getCustomers" | "getLedgerEntries" | "getCustomerById" | "getDashboard" | "getOverdueEntries";
  customerNo?: string;
  filter?: string;
  top?: number;
  skip?: number;
  bypassCache?: boolean;
}

// Resposta normalizada da Edge Function
export interface BCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cacheAge?: number;             // segundos desde que o cache foi gerado
}
