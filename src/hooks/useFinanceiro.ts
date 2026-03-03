import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export type AccountStatus = "regularizado" | "pendente" | "em_incumprimento";

export interface AccountSummary {
  status: AccountStatus;
  tipoCliente: "pessoa_individual" | "pessoa_coletiva";
  prazoPagamentoDias: number;
  totalEmAberto: number;
  totalFaturas: number;
  faturasEmAberto: number;
  faturasVencidas: number;
  faturasPagas: number;
  proximoVencimento: Date | null;
}

function calculateAccountStatusFromNav(
  navCache: NavCache | null
): AccountStatus {
  // Sem dados ou sem valor pendente → Regularizado
  if (!navCache || navCache.valor_pendente === null || navCache.valor_pendente <= 0) {
    return "regularizado";
  }

  // Com valor pendente mas sem data de vencimento → Pendente
  if (!navCache.data_vencimento) {
    return "pendente";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(navCache.data_vencimento);
  vencimento.setHours(0, 0, 0, 0);

  const diffMs = hoje.getTime() - vencimento.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Vencido há 7 ou mais dias → Em incumprimento
  if (diffDays >= 7) {
    return "em_incumprimento";
  }

  // Com valor pendente + vencimento há menos de 7 dias → Pendente
  return "pendente";
}

export function useFinanceiro() {
  const { profile } = useProfile();
  const { isPlatformAdmin } = usePlatformAdmin();
  const organizationId = profile?.current_organization_id;
  const queryClient = useQueryClient();

  // Buscar info financeira da organização
  const { data: orgInfo } = useQuery({
    queryKey: ["organization-financial-info", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("tipo_cliente, prazo_pagamento_dias, jvris_id")
        .eq("id", organizationId)
        .single();

      if (error) throw error;
      return data as OrganizationFinancialInfo;
    },
    enabled: !!organizationId,
  });

  // Buscar dados do cache Base Nav (via jvris_id da organização)
  const { data: navCache } = useQuery({
    queryKey: ["financeiro-nav-cache", orgInfo?.jvris_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_nav_cache")
        .select("*")
        .eq("jvris_id", orgInfo!.jvris_id!)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return (data as NavCache) || null;
    },
    enabled: !!orgInfo?.jvris_id,
  });

  // Buscar faturas
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

  // Buscar pastas ativas
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

  // Calcular resumo da conta
  const tipoCliente = orgInfo?.tipo_cliente || "pessoa_coletiva";
  const prazoPagamentoDias = orgInfo?.prazo_pagamento_dias || 30;

  const accountSummary: AccountSummary = {
    status: calculateAccountStatusFromNav(navCache ?? null),
    tipoCliente,
    prazoPagamentoDias,
    totalEmAberto: invoices
      .filter((f) => f.estado === "em_aberto" || f.estado === "vencida")
      .reduce((sum, f) => sum + Number(f.valor), 0),
    totalFaturas: invoices.length,
    faturasEmAberto: invoices.filter((f) => f.estado === "em_aberto").length,
    faturasVencidas: invoices.filter((f) => f.estado === "vencida").length,
    faturasPagas: invoices.filter((f) => f.estado === "paga").length,
    proximoVencimento: navCache?.data_vencimento ? new Date(navCache.data_vencimento) : null,
  };

  // Mutação para criar fatura
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

  // Mutação para atualizar estado da fatura
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

  // Mutação para eliminar fatura
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

  // Mutação para atualizar configurações financeiras da organização
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
      queryClient.invalidateQueries({ queryKey: ["organization-financial-info", organizationId] });
      toast.success("Configurações atualizadas");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configurações: " + error.message);
    },
  });

  // Mutação para sincronizar Base Nav do SharePoint
  const syncNavFromSharePoint = useMutation({
    mutationFn: async () => {
      // Pre-flight: check SharePoint is configured for this org
      const { data: spConfig } = await supabase
        .from("sharepoint_config")
        .select("id")
        .eq("organization_id", organizationId!)
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
        // Extract real error message from edge function response body
        let msg = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx instanceof Response) {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* keep generic message */ }
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-nav-cache"] });
      queryClient.invalidateQueries({ queryKey: ["organization-financial-info", organizationId] });
      toast.success(`Base Nav sincronizada: ${data?.synced ?? 0} registos atualizados`);
    },
    onError: (error) => {
      toast.error("Erro ao sincronizar Base Nav: " + error.message);
    },
  });

  // Mutação para criar pasta
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
    jvrisId: orgInfo?.jvris_id ?? null,
    organizationId,
    isLoading: isLoadingInvoices || isLoadingFolders,
    isPlatformAdmin,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    updateOrganizationFinancial,
    syncNavFromSharePoint,
    createFolder,
  };
}
