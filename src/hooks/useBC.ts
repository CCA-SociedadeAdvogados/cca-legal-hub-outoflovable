import { useQuery } from "@tanstack/react-query";
import { bcApi } from "@/lib/bcApi";
import { BCCustomer, BCLedgerEntry, BCDashboardStats } from "../../supabase/functions/_shared/types";

// ─── Clientes ───────────────────────────────────────────────────────────────

interface UseCustomersOptions {
  filter?: string;
  top?: number;
  skip?: number;
  enabled?: boolean;
}

export function useCustomers(opts: UseCustomersOptions = {}) {
  const { filter, top, skip, enabled = true } = opts;

  return useQuery<BCCustomer[], Error>({
    queryKey: ["bc-customers", filter, top, skip],
    queryFn: () => bcApi.getCustomers({ filter, top, skip }),
    enabled,
    staleTime: 5 * 60 * 1000,   // 5 min — alinhado com o TTL do cache servidor
    retry: 1,
  });
}

export function useCustomerById(customerNo: string | undefined, enabled = true) {
  return useQuery<BCCustomer | null, Error>({
    queryKey: ["bc-customer", customerNo],
    queryFn: () => bcApi.getCustomerById(customerNo!),
    enabled: enabled && !!customerNo,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ─── Movimentos de conta corrente ────────────────────────────────────────────

interface UseLedgerEntriesOptions {
  customerNo?: string;
  filter?: string;
  top?: number;
  skip?: number;
  enabled?: boolean;
}

export function useLedgerEntries(opts: UseLedgerEntriesOptions = {}) {
  const { customerNo, filter, top, skip, enabled = true } = opts;

  return useQuery<BCLedgerEntry[], Error>({
    queryKey: ["bc-ledger", customerNo, filter, top, skip],
    queryFn: () => bcApi.getLedgerEntries({ customerNo, filter, top, skip }),
    enabled,
    staleTime: 2 * 60 * 1000,   // 2 min
    retry: 1,
  });
}

export function useOverdueEntries(customerNo?: string) {
  return useQuery<BCLedgerEntry[], Error>({
    queryKey: ["bc-overdue", customerNo],
    queryFn: () => bcApi.getOverdueEntries({ customerNo }),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useBCDashboard() {
  return useQuery<BCDashboardStats, Error>({
    queryKey: ["bc-dashboard"],
    queryFn: () => bcApi.getDashboard(),
    staleTime: 3 * 60 * 1000,   // 3 min
    retry: 1,
  });
}
