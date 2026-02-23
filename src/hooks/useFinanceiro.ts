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
}

export type AccountStatus = "regularizado" | "atencao" | "em_atraso";

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

function calculateAccountStatus(
  invoices: Invoice[],
  tipoCliente: "pessoa_individual" | "pessoa_coletiva",
  prazoPagamentoDias: number
): AccountStatus {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const faturasNaoPagas = invoices.filter(
    (f) => f.estado === "em_aberto" || f.estado === "vencida" || f.estado === "em_disputa"
  );

  if (faturasNaoPagas.length === 0) {
    return "regularizado";
  }

  // If any invoice is explicitly marked as "vencida", account is overdue
  if (faturasNaoPagas.some((f) => f.estado === "vencida")) {
    return "em_atraso";
  }

  // If any invoice is in dispute, account needs attention
  if (invoices.some((f) => f.estado === "em_disputa")) {
    return "atencao";
  }

  // If there are open invoices, check dates for attention/overdue
  if (tipoCliente === "pessoa_individual") {
    // Pessoa Individual: prazo = data de emissão
    for (const fatura of faturasNaoPagas) {
      const dataEmissao = new Date(fatura.data_emissao);
      dataEmissao.setHours(0, 0, 0, 0);

      if (dataEmissao < hoje) {
        return "em_atraso";
      }
      if (dataEmissao.getTime() === hoje.getTime()) {
        return "atencao";
      }
    }
    return "regularizado";
  } else {
    // Pessoa Coletiva: prazo = data_emissao + prazo_pagamento_dias
    for (const fatura of faturasNaoPagas) {
      const dataEmissao = new Date(fatura.data_emissao);
      const prazoFinal = new Date(dataEmissao);
      prazoFinal.setDate(prazoFinal.getDate() + prazoPagamentoDias);
      prazoFinal.setHours(0, 0, 0, 0);

      if (prazoFinal < hoje) {
        return "em_atraso";
      }

      // Menos de 7 dias para vencer
      const diasRestantes = Math.ceil(
        (prazoFinal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasRestantes <= 7 && diasRestantes > 0) {
        return "atencao";
      }
    }
    return "regularizado";
  }
}

function calculateNextDueDate(
  invoices: Invoice[],
  tipoCliente: "pessoa_individual" | "pessoa_coletiva",
  prazoPagamentoDias: number
): Date | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const faturasNaoPagas = invoices.filter(
    (f) => f.estado === "em_aberto" || f.estado === "vencida"
  );

  if (faturasNaoPagas.length === 0) {
    return null;
  }

  let proximaData: Date | null = null;

  for (const fatura of faturasNaoPagas) {
    const dataEmissao = new Date(fatura.data_emissao);
    let prazoFinal: Date;

    if (tipoCliente === "pessoa_individual") {
      prazoFinal = dataEmissao;
    } else {
      prazoFinal = new Date(dataEmissao);
      prazoFinal.setDate(prazoFinal.getDate() + prazoPagamentoDias);
    }

    if (!proximaData || prazoFinal < proximaData) {
      proximaData = prazoFinal;
    }
  }

  return proximaData;
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
        .select("tipo_cliente, prazo_pagamento_dias")
        .eq("id", organizationId)
        .single();

      if (error) throw error;
      return data as OrganizationFinancialInfo;
    },
    enabled: !!organizationId,
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
    status: calculateAccountStatus(invoices, tipoCliente, prazoPagamentoDias),
    tipoCliente,
    prazoPagamentoDias,
    totalEmAberto: invoices
      .filter((f) => f.estado === "em_aberto" || f.estado === "vencida")
      .reduce((sum, f) => sum + Number(f.valor), 0),
    totalFaturas: invoices.length,
    faturasEmAberto: invoices.filter((f) => f.estado === "em_aberto").length,
    faturasVencidas: invoices.filter((f) => f.estado === "vencida").length,
    faturasPagas: invoices.filter((f) => f.estado === "paga").length,
    proximoVencimento: calculateNextDueDate(invoices, tipoCliente, prazoPagamentoDias),
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
    organizationId,
    isLoading: isLoadingInvoices || isLoadingFolders,
    isPlatformAdmin,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    updateOrganizationFinancial,
    createFolder,
  };
}
