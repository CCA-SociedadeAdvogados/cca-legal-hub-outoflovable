import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useProfile } from "@/hooks/useProfile";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  organization_id: string;
  numero: string;
  data_emissao: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor: number;
  moeda: string;
  estado: "paga" | "em_aberto" | "vencida" | "em_disputa";
  url_ficheiro: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFolder {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  estado: "ativa" | "fechada";
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationFinancialInfo {
  tipo_cliente: "pessoa_individual" | "pessoa_coletiva";
  prazo_pagamento_dias: number;
  jvris_id: string | null;
}

export interface NavCache {
  id: string;
  jvris_id: string;
  valor_pendente: number | null;
  data_vencimento: string | null;
  synced_at: string | null;
}

export interface NavItem {
  id: string;
  jvris_id: string;
  numero_documento: string | null;
  valor: number | null;
  data_vencimento: string | null;
  synced_at: string | null;
}

export type AccountStatus = "em_dia" | "em_aberto" | "em_incumprimento";

export interface AccountSummary {
  status: AccountStatus;
  tipoCliente: "pessoa_individual" | "pessoa_coletiva";
  prazoPagamentoDias: number;
  totalEmAberto: number;
  totalFaturasEmIncumprimento: number;
  faturasEmAberto: number;
  faturasVencidas: number;
  proximoVencimento: Date | null;
  emIncumprimentoDesde: Date | null;
}

function calculateAccountStatusFromNav(
  navCache: NavCache | null,
  navItems: NavItem[]
): AccountStatus {
  if (!navCache || navCache.valor_pendente === null || navCache.valor_pendente <= 0) {
    return "em_dia";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let oldestOverdueDays = 0;

  for (const item of navItems) {
    if (!item.data_vencimento) continue;

    const vencimento = new Date(item.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > oldestOverdueDays) {
      oldestOverdueDays = diffDays;
    }
  }

  if (navItems.length === 0 && navCache.data_vencimento) {
    const vencimento = new Date(navCache.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);

    oldestOverdueDays = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  if (oldestOverdueDays <= 0) {
    return "em_dia";
  }

  if (oldestOverdueDays >= 30) {
    return "em_incumprimento";
  }

  return "em_aberto";
}

/**
 * @param overrideOrgId - Quando fornecido (ex: seleção via ClienteSelectorJvris por utilizadores CCA),
 * os dados são carregados para esta organização em vez da organização atual do perfil.
 */
export function useFinanceiro(overrideOrgId?: string) {
  const { profile } = useProfile();
  const { isPlatformAdmin } = usePlatformAdmin();
  const organizationId = overrideOrgId || profile?.current_organization_id;
  const queryClient = useQueryClient();

  const [lastSyncResult, setLastSyncResult] = useState<{
    jvris_ids?: string[];
    auto_linked?: string | null;
    needs_jvris_config?: boolean;
    synced?: number;
    items?: number;
  } | null>(null);

    const {
    data: orgInfo,
    isLoading: isLoadingOrgInfo,
    refetch: refetchOrgInfo,
  } = useQuery({
    queryKey: ["organization-financial-info", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("tipo_cliente, prazo_pagamento_dias, jvris_id")
        .eq("id", organizationId)
        .maybeSingle();

      if (error) throw error;

      return (data as OrganizationFinancialInfo | null) ?? null;
    },
    enabled: !!organizationId,
  });

    const {
    data: navCache,
    error: navCacheError,
    isLoading: isLoadingNavCache,
  } = useQuery({
    queryKey: ["financeiro-nav-cache", orgInfo?.jvris_id],
    queryFn: async () => {
      if (!orgInfo?.jvris_id) {
        return null;
      }

      const { data, error } = await supabase
        .from("financeiro_nav_cache")
        .select("id, jvris_id, valor_pendente, data_vencimento, synced_at")
        .eq("jvris_id", orgInfo.jvris_id)
        .maybeSingle();

      if (error) throw error;

      return (data as NavCache | null) ?? null;
    },
    enabled: !!orgInfo?.jvris_id,
  });

   const {
    data: navItems = [],
    error: navItemsError,
    isLoading: isLoadingNavItems,
  } = useQuery({
    queryKey: ["financeiro-nav-items", orgInfo?.jvris_id],
    queryFn: async () => {
      if (!orgInfo?.jvris_id) {
        return [];
      }

      const { data, error } = await supabase
        .from("financeiro_nav_items")
        .select("id, jvris_id, numero_documento, valor, data_vencimento, synced_at")
        .eq("jvris_id", orgInfo.jvris_id)
        .not("numero_documento", "is", null)
        .neq("numero_documento", "")
        .not("data_vencimento", "is", null)
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      return (data as NavItem[]) ?? [];
    },
    enabled: !!orgInfo?.jvris_id,
  });

    const { data: availableJvrisIds = [] } = useQuery({
    queryKey: ["available-jvris-ids", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_nav_cache")
        .select("jvris_id");

      if (error) throw error;

      return Array.from(
        new Set(
          (data ?? [])
            .map((row: { jvris_id: string | null }) => row.jvris_id?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort();
    },
    enabled: !!organizationId && !orgInfo?.jvris_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("data_emissao", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!organizationId,
  });

  const { data: folders = [], isLoading: isLoadingFolders } = useQuery({
    queryKey: ["client-folders", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_folders")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("estado", "ativa")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientFolder[];
    },
    enabled: !!organizationId,
  });

  const tipoCliente = orgInfo?.tipo_cliente || "pessoa_coletiva";
  const prazoPagamentoDias = orgInfo?.prazo_pagamento_dias || 30;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const navItemsVencidas = navItems.filter((item) => {
    if (!item.data_vencimento) return false;
    const d = new Date(item.data_vencimento);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < hoje.getTime();
  });

  const navItemsEmAberto = navItems.filter((item) => {
    if (!item.data_vencimento) return true;
    const d = new Date(item.data_vencimento);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= hoje.getTime();
  });

  const hasNavItems = navItems.length > 0;
  const hasNavCache = navCache?.valor_pendente != null && navCache.valor_pendente > 0;

  const navCacheIsOverdue =
    hasNavCache && navCache.data_vencimento
      ? new Date(navCache.data_vencimento).getTime() < hoje.getTime()
      : false;

  const accountSummary: AccountSummary = {
    status: calculateAccountStatusFromNav(navCache ?? null, navItems),
    tipoCliente,
    prazoPagamentoDias,
    totalEmAberto: hasNavCache
      ? navCache!.valor_pendente ?? 0
      : invoices
          .filter((f) => f.estado === "em_aberto" || f.estado === "vencida")
          .reduce((sum, f) => sum + Number(f.valor), 0),
    totalFaturasEmIncumprimento: hasNavItems
      ? navItems.length
      : hasNavCache
        ? 1
        : invoices.filter((f) => f.estado !== "paga").length,
    faturasEmAberto: hasNavItems
      ? navItemsEmAberto.length
      : hasNavCache && !navCacheIsOverdue
        ? 1
        : invoices.filter((f) => f.estado === "em_aberto").length,
    faturasVencidas: hasNavItems
      ? navItemsVencidas.length
      : hasNavCache && navCacheIsOverdue
        ? 1
        : invoices.filter((f) => f.estado === "vencida").length,
    proximoVencimento: navCache?.data_vencimento ? new Date(navCache.data_vencimento) : null,
    emIncumprimentoDesde:
      navItemsVencidas.length > 0
        ? new Date(
            navItemsVencidas
              .map((item) => new Date(item.data_vencimento!))
              .sort((a, b) => a.getTime() - b.getTime())[0]
          )
        : navCacheIsOverdue && navCache?.data_vencimento
          ? new Date(navCache.data_vencimento)
          : null,
  };

  const runNavSync = async () => {
    if (!organizationId) {
      throw new Error("Organização não definida.");
    }

    const { data: spConfig } = await supabase
      .from("sharepoint_config")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!spConfig) {
      throw new Error(
        "SharePoint não configurado para esta organização. Configure a integração SharePoint primeiro em Definições."
      );
    }

    const { data, error } = await supabase.functions.invoke("sync-nav-excel", {
      body: { organization_id: organizationId },
    });

    if (error) {
      let msg = error.message;

      try {
        const ctx = (error as any).context;

        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) {
            msg =
              typeof body.error === "string"
                ? body.error
                : body.error?.message || JSON.stringify(body.error);
          }
        } else if ((error as any)?.context?.error) {
          const ctxError = (error as any).context.error;
          msg =
            typeof ctxError === "string"
              ? ctxError
              : ctxError?.message || JSON.stringify(ctxError);
        }
      } catch {
        // mantém a mensagem base
      }

      if (msg === "[object Object]" || msg === "Edge Function returned a non-2xx status code") {
        msg = "Erro na Edge Function. Verifique os logs para mais detalhes.";
      }

      console.error("[sync-nav-excel]", msg);
      throw new Error(msg);
    }

    return data;
  };

  const createInvoice = useMutation({
    mutationFn: async (invoice: Omit<Invoice, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoice)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", organizationId] });
      toast.success("Fatura criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar fatura: " + error.message);
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Invoice["estado"] }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ estado })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", organizationId] });
      toast.success("Estado da fatura atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar fatura: " + error.message);
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", organizationId] });
      toast.success("Fatura eliminada");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar fatura: " + error.message);
    },
  });

  const updateOrganizationFinancial = useMutation({
    mutationFn: async (data: {
      tipo_cliente: "pessoa_individual" | "pessoa_coletiva";
      prazo_pagamento_dias: number;
    }) => {
      const { error } = await supabase
        .from("organizations")
        .update(data)
        .eq("id", organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-financial-info", organizationId],
      });
      toast.success("Configurações atualizadas");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configurações: " + error.message);
    },
  });

  const syncNavFromSharePoint = useMutation({
    mutationFn: async () => {
      const data = await runNavSync();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["organization-financial-info", organizationId],
        }),
        queryClient.invalidateQueries({ queryKey: ["financeiro-nav-cache"] }),
        queryClient.invalidateQueries({ queryKey: ["financeiro-nav-items"] }),
        queryClient.invalidateQueries({
          queryKey: ["available-jvris-ids", organizationId],
        }),
      ]);

      await refetchOrgInfo();

      return data;
    },
    onSuccess: (data) => {
      setLastSyncResult(data ?? null);

      let msg = `Base NAV sincronizada: ${data?.synced ?? 0} clientes, ${data?.items ?? 0} faturas`;
      if (data?.auto_linked) {
        msg += ` (ID Jvris configurado: ${data.auto_linked})`;
      }

      toast.success(msg);
    },
    onError: (error) => {
      toast.error("Erro ao sincronizar Base NAV: " + error.message);
    },
  });

   const setJvrisId = useMutation({
    mutationFn: async (jvrisId: string) => {
      if (!organizationId) {
        throw new Error("Organização não definida.");
      }

      const normalizedId = jvrisId.trim();

      if (!normalizedId) {
        throw new Error("ID Jvris inválido.");
      }

      const payload: TablesUpdate<"organizations"> = {
        jvris_id: normalizedId,
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", organizationId);

      if (updateError) throw updateError;

      const syncData = await runNavSync();

      await queryClient.invalidateQueries({
        queryKey: ["organization-financial-info", organizationId],
      });

      const refreshedOrg = await refetchOrgInfo();

      if (refreshedOrg.error) {
        throw refreshedOrg.error;
      }

      const refreshedJvrisId = refreshedOrg.data?.jvris_id ?? null;

      if (refreshedJvrisId !== normalizedId) {
        throw new Error(
          `O ID Jvris foi gravado, mas a organização ainda não reflecte o valor esperado. Esperado: ${normalizedId}; actual: ${refreshedJvrisId ?? "null"}`
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["financeiro-nav-cache", normalizedId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["financeiro-nav-items", normalizedId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["available-jvris-ids", organizationId],
        }),
      ]);

      return {
        jvrisId: normalizedId,
        syncData: syncData ?? null,
        organizationFinancialInfo: refreshedOrg.data ?? null,
      };
    },
    onSuccess: ({ syncData }) => {
      setLastSyncResult(syncData ?? null);

      let msg = "ID Jvris configurado e Base NAV sincronizada com sucesso";
      if (syncData?.synced != null || syncData?.items != null) {
        msg += `: ${syncData?.synced ?? 0} clientes, ${syncData?.items ?? 0} faturas`;
      }

      toast.success(msg);
    },
    onError: (error) => {
      toast.error("Erro ao configurar ID Jvris: " + error.message);
    },
  });

    const createFolder = useMutation({
    mutationFn: async (folder: { nome: string; descricao?: string; tags?: string[] }) => {
      const { data, error } = await supabase
        .from("client_folders")
        .insert({
          organization_id: organizationId,
          ...folder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-folders", organizationId] });
      toast.success("Pasta criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar pasta: " + error.message);
    },
  });

  return {
    invoices,
    folders,
    accountSummary,
    navCache: navCache ?? null,
    navItems,
    navError: navItemsError || navCacheError || null,
    jvrisId: orgInfo?.jvris_id ?? null,
    availableJvrisIds,
    lastSyncResult,
    organizationId,
    isLoading: isLoadingInvoices || isLoadingFolders || isLoadingOrgInfo,
    isLoadingNav: isLoadingOrgInfo || isLoadingNavCache || isLoadingNavItems,
    isPlatformAdmin,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    updateOrganizationFinancial,
    syncNavFromSharePoint,
    setJvrisId,
    createFolder,
  };
}
