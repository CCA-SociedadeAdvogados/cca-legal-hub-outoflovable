import { supabase } from "@/integrations/supabase/client";
import {
  BCCustomer,
  BCLedgerEntry,
  BCDashboardStats,
  BCRequest,
  BCResponse,
} from "../../supabase/functions/_shared/types";

/** Chama a Edge Function bc-integration com o payload dado. */
async function invoke<T>(payload: BCRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke<BCResponse<T>>(
    "bc-integration",
    { body: payload }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error ?? "Erro desconhecido na integração BC");
  }

  return data.data as T;
}

/**
 * SDK de acesso ao Business Central.
 *
 * Todos os métodos chamam a Edge Function bc-integration que:
 *  1. Verifica cache em Supabase (TTL configurável)
 *  2. Se necessário, chama o Power Automate Flow
 *  3. Devolve dados normalizados
 */
export const bcApi = {
  /** Lista todos os clientes BC da empresa configurada. */
  getCustomers(opts?: { filter?: string; top?: number; skip?: number; bypassCache?: boolean }) {
    return invoke<BCCustomer[]>({ action: "getCustomers", ...opts });
  },

  /** Obtém um cliente BC por número. */
  getCustomerById(customerNo: string, opts?: { bypassCache?: boolean }) {
    return invoke<BCCustomer | null>({ action: "getCustomerById", customerNo, ...opts });
  },

  /** Lista movimentos de conta corrente. Filtrável por cliente. */
  getLedgerEntries(opts?: {
    customerNo?: string;
    filter?: string;
    top?: number;
    skip?: number;
    bypassCache?: boolean;
  }) {
    return invoke<BCLedgerEntry[]>({ action: "getLedgerEntries", ...opts });
  },

  /** Lista apenas movimentos vencidos e em aberto. */
  getOverdueEntries(opts?: { customerNo?: string; bypassCache?: boolean }) {
    return invoke<BCLedgerEntry[]>({ action: "getOverdueEntries", ...opts });
  },

  /** Devolve estatísticas agregadas para o dashboard. */
  getDashboard(opts?: { bypassCache?: boolean }) {
    return invoke<BCDashboardStats>({ action: "getDashboard", ...opts });
  },
};
