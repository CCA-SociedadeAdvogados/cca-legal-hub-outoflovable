import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinanceiro, type AccountStatus } from "@/hooks/useFinanceiro";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  User,
  Calendar,
  Settings,
  RefreshCw,
  Search,
  Loader2,
  FileText,
  Hash,
} from "lucide-react";
import { SharePointDocumentsBrowser } from "@/components/sharepoint/SharePointDocumentsBrowser";
import { ClienteSelectorJvris } from "@/components/ClienteSelectorJvris";
import { useLegalHubProfile } from "@/hooks/useLegalHubProfile";
import { useCliente } from "@/contexts/ClienteContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

const statusColors: Record<AccountStatus, string> = {
  em_dia: "bg-risk-low/20 text-risk-low border-risk-low/30",
  em_aberto: "bg-gray-100 dark:bg-gray-800 text-risk-medium border-risk-medium/30",
  em_incumprimento: "bg-gray-100 dark:bg-gray-800 text-destructive border-destructive/30",
};

const statusIcons: Record<AccountStatus, ReactNode> = {
  em_dia: <CheckCircle className="h-5 w-5" />,
  em_aberto: <AlertTriangle className="h-5 w-5" />,
  em_incumprimento: <Clock className="h-5 w-5" />,
};

export default function Financeiro() {
  const { t, i18n } = useTranslation();
  const { cliente } = useCliente();
  const { isCCAUser } = useLegalHubProfile();
  const queryClient = useQueryClient();

  const effectiveSelectedJvrisId = cliente?.jvrisId?.trim() || null;

  const {
    accountSummary,
    navCache,
    navItems,
    navError,
    jvrisId,
    availableJvrisIds,
    lastSyncResult,
    isLoading,
    isLoadingNav,
    isPlatformAdmin,
    updateOrganizationFinancial,
    syncNavFromSharePoint,
    setJvrisId,
    organizationId,
  } = useFinanceiro(cliente?.organizationId, effectiveSelectedJvrisId);

  const [activeTab, setActiveTab] = useState("financeiro");

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [jvrisSearchQuery, setJvrisSearchQuery] = useState("");
  const [selectedJvrisId, setSelectedJvrisId] = useState<string | null>(null);
  const [isConfirmingJvrisSelection, setIsConfirmingJvrisSelection] = useState(false);
  const [isJvrisDialogOpen, setIsJvrisDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedJvrisId(null);
    setJvrisSearchQuery("");
    setIsConfirmingJvrisSelection(false);
    setIsJvrisDialogOpen(false);
  }, [cliente?.organizationId]);

  const hasAvailableIds =
    (lastSyncResult?.jvris_ids?.length ?? 0) > 1 || availableJvrisIds.length > 1;

  const showJvrisSelector =
    !jvrisId &&
    hasAvailableIds &&
    (isPlatformAdmin || isCCAUser);

  useEffect(() => {
    if (showJvrisSelector) {
      setIsJvrisDialogOpen(true);
    } else {
      setIsJvrisDialogOpen(false);
    }
  }, [showJvrisSelector]);

  const filteredJvrisIds = useMemo(() => {
    const ids =
      (lastSyncResult?.jvris_ids?.length ?? 0) > 0
        ? lastSyncResult!.jvris_ids!
        : availableJvrisIds;

    if (!jvrisSearchQuery.trim()) return ids;

    const q = jvrisSearchQuery.trim().toLowerCase();
    return ids.filter((id) => id.toLowerCase().includes(q));
  }, [lastSyncResult, availableJvrisIds, jvrisSearchQuery]);

  const [configForm, setConfigForm] = useState({
    tipo_cliente: accountSummary.tipoCliente,
    prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
  });

  useEffect(() => {
    setConfigForm({
      tipo_cliente: accountSummary.tipoCliente,
      prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
    });
  }, [accountSummary.tipoCliente, accountSummary.prazoPagamentoDias]);

  const dateLocale = i18n.language === "pt" ? pt : enUS;

  const { data: contratosCliente = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos-org-cliente", cliente?.organizationId],
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id, titulo_contrato, tipo_contrato, estado_contrato, data_inicio, data_termo, parte_b_nome_legal, valor_total_estimado, nivel_risco"
        )
        .eq("organization_id", cliente!.organizationId)
        .eq("arquivado", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Contrato[];
    },
    enabled: !!cliente?.organizationId && (isCCAUser || isPlatformAdmin),
    staleTime: 30 * 1000,
  });

  const { data: orgCliente, isLoading: isLoadingOrgCliente } = useQuery({
    queryKey: ["org-ficha", cliente?.organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, name, slug, jvris_id, tipo_cliente, prazo_pagamento_dias, logo_url, industry_sectors, created_at"
        )
        .eq("id", cliente!.organizationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!cliente?.organizationId && (isCCAUser || isPlatformAdmin),
    staleTime: 60 * 1000,
  });

  const isOverdue = (dateStr: string | null): boolean => {
    if (!dateStr) return false;

    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return d.getTime() < today.getTime();
  };

  const getStatusLabel = (status: AccountStatus) => {
    const labels: Record<AccountStatus, string> = {
      em_dia: t("financial.emDia"),
      em_aberto: t("financial.emAberto"),
      em_incumprimento: t("financial.inDefault"),
    };
    return labels[status];
  };

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat(i18n.language === "pt" ? "pt-PT" : "en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleUpdateConfig = () => {
    updateOrganizationFinancial.mutate(
      {
        tipo_cliente: configForm.tipo_cliente as "pessoa_individual" | "pessoa_coletiva",
        prazo_pagamento_dias: parseInt(configForm.prazo_pagamento_dias, 10),
      },
      {
        onSuccess: () => setConfigDialogOpen(false),
      }
    );
  };

  const handleConfirmJvrisSelection = async () => {
    if (!selectedJvrisId || !organizationId) {
      return;
    }

    try {
      setIsConfirmingJvrisSelection(true);

      await setJvrisId.mutateAsync(selectedJvrisId);

      setIsJvrisDialogOpen(false);
      setSelectedJvrisId(null);
      setJvrisSearchQuery("");

      await queryClient.refetchQueries({
        queryKey: ["organization-financial-info", organizationId],
        exact: true,
      });

      await queryClient.refetchQueries({
        queryKey: ["financeiro-nav-cache", organizationId, selectedJvrisId],
        exact: true,
      });

      await queryClient.refetchQueries({
        queryKey: ["financeiro-nav-items", organizationId, selectedJvrisId],
        exact: true,
      });
    } catch (error) {
      console.error("[Financeiro] erro ao confirmar selecção de jvris_id:", error);
    } finally {
      setIsConfirmingJvrisSelection(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  const tabFinanceiro = (
    <>
      <Card className={`border-2 ${statusColors[accountSummary.status]}`}>
        <CardHeader>
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex min-w-0 items-center gap-2">
                {statusIcons[accountSummary.status]}
                <span className="truncate">
                  {t("financial.accountStatus")}: {getStatusLabel(accountSummary.status)}
                </span>
              </CardTitle>

              <CardDescription className="mt-1 flex min-w-0 items-center gap-2">
                {accountSummary.tipoCliente === "pessoa_individual" ? (
                  <>
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t("financial.individualPerson")}</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {t("financial.legalEntity", { days: accountSummary.prazoPagamentoDias })}
                    </span>
                  </>
                )}
              </CardDescription>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm text-muted-foreground">{t("financial.totalOpen")}</p>
              <p className="text-2xl font-bold">{formatCurrency(accountSummary.totalEmAberto)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("financial.totalInDefault")}</p>
                <p className="text-lg font-semibold">
                  {accountSummary.totalFaturasEmIncumprimento}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("financial.openAmount")}</p>
                <p className="text-lg font-semibold">{accountSummary.faturasEmAberto}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-destructive/20 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("financial.overdueCount")}</p>
                <p className="text-lg font-semibold">{accountSummary.faturasVencidas}</p>
              </div>
            </div>
          </div>

          {accountSummary.emIncumprimentoDesde && (
            <div className="mt-4 flex items-center gap-2 border-t pt-4 text-sm">
              <Calendar className="h-4 w-4 text-risk-high" />
              <span className="text-risk-high">{t("financial.defaultSince")}:</span>
              <span className="font-medium text-risk-high">
                {format(
                  accountSummary.emIncumprimentoDesde,
                  i18n.language === "pt" ? "dd 'de' MMMM 'de' yyyy" : "MMMM d, yyyy",
                  { locale: dateLocale }
                )}
              </span>
            </div>
          )}

          <div className="mt-4 space-y-3 border-t pt-4">
            {!isLoadingNav &&
              (navItems.length > 0 ||
                (navCache && navCache.valor_pendente != null && navCache.valor_pendente > 0)) && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {t("financial.pendingInvoices")}:{" "}
                    <strong className="text-foreground">
                      {accountSummary.totalFaturasEmIncumprimento}
                    </strong>
                  </span>

                  {accountSummary.faturasVencidas > 0 && (
                    <span className="text-destructive">
                      {accountSummary.faturasVencidas} {t("financial.overdue")}
                    </span>
                  )}

                  {accountSummary.faturasEmAberto > 0 && (
                    <span className="text-primary">
                      {accountSummary.faturasEmAberto} {t("financial.withinTerm")}
                    </span>
                  )}
                </div>
              )}

            {navError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t("financial.errorLoadingInvoices")}</span>
              </div>
            )}

            <div className="w-full min-w-0 overflow-x-auto rounded-md border">
              <div className="min-w-[720px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("financial.invoiceNumber")}</TableHead>
                      <TableHead>{t("financial.dueDate")}</TableHead>
                      <TableHead className="text-right">{t("financial.amount")}</TableHead>
                      <TableHead>{t("financial.invoiceStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoadingNav ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                          <TableCell>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-20" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="ml-auto h-5 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-16" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : navItems.length > 0 ? (
                      navItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.numero_documento || "—"}
                          </TableCell>
                          <TableCell>
                            {item.data_vencimento
                              ? format(new Date(item.data_vencimento), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.valor != null ? formatCurrency(item.valor) : "—"}
                          </TableCell>
                          <TableCell>
                            {item.data_vencimento && isOverdue(item.data_vencimento) ? (
                              <Badge variant="destructive" className="text-xs">
                                {t("financial.overdue")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t("financial.withinTerm")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : navCache && navCache.valor_pendente != null && navCache.valor_pendente > 0 ? (
                      <TableRow>
                        <TableCell className="text-sm text-muted-foreground">
                          {t("financial.pendingBalance")}
                        </TableCell>
                        <TableCell>
                          {navCache.data_vencimento
                            ? format(new Date(navCache.data_vencimento), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(navCache.valor_pendente)}
                        </TableCell>
                        <TableCell>
                          {navCache.data_vencimento && isOverdue(navCache.data_vencimento) ? (
                            <Badge variant="destructive" className="text-xs">
                              {t("financial.overdue")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t("financial.withinTerm")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : !navError ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          <Receipt className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          <p>{t("financial.noInvoices")}</p>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SharePointDocumentsBrowser />
    </>
  );

  const tabContratos = (
    <Card>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="truncate">{t("contracts.title")}</span>
          {cliente && (
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              <Hash className="mr-1 h-3 w-3" />
              {cliente.jvrisId}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="truncate">{cliente ? cliente.nome : ""}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="w-full min-w-0 overflow-x-auto rounded-md border">
          <div className="min-w-[720px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("contracts.title")}</TableHead>
                  <TableHead>{t("contracts.type")}</TableHead>
                  <TableHead>{t("contracts.status")}</TableHead>
                  <TableHead>{t("contracts.endDate")}</TableHead>
                  <TableHead>{t("contracts.risk")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingContratos ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contratosCliente.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>{t("dashboard.noContracts")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  contratosCliente.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {c.titulo_contrato}
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {c.tipo_contrato?.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {c.estado_contrato?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.data_termo ? format(new Date(c.data_termo), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {c.nivel_risco && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              c.nivel_risco === "alto"
                                ? "border-risk-high/50 text-risk-high"
                                : c.nivel_risco === "medio"
                                  ? "border-risk-medium/50 text-risk-medium"
                                  : "border-risk-low/50 text-risk-low"
                            }`}
                          >
                            {c.nivel_risco}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const tabFicha = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t("organization.title")}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoadingOrgCliente ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : orgCliente ? (
          <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-4">
              {orgCliente.logo_url ? (
                <img
                  src={orgCliente.logo_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold">{orgCliente.name}</h3>
                <p className="truncate font-mono text-sm text-muted-foreground">{orgCliente.slug}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("financial.jvrisId")}
                </p>
                <p className="font-mono font-medium">{orgCliente.jvris_id || "—"}</p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("financial.clientType")}
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  {orgCliente.tipo_cliente === "pessoa_individual" ? (
                    <>
                      <User className="h-4 w-4" />
                      {t("financial.individualPerson")}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      {t("financial.legalEntity", { days: "" })}
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("financial.paymentTerm")}
                </p>
                <p className="font-medium">
                  {orgCliente.prazo_pagamento_dias ?? "—"} {t("home.days")}
                </p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("ccaNews.createdAt")}
                </p>
                <p className="font-medium">
                  {orgCliente.created_at ? format(new Date(orgCliente.created_at), "dd/MM/yyyy") : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("dashboard.noData")}</p>
        )}
      </CardContent>
    </Card>
  );

  const showClienteTabs = !!(cliente && (isCCAUser || isPlatformAdmin));

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-bold text-foreground">{t("financial.title")}</h1>
            <p className="truncate text-muted-foreground">{t("financial.subtitle")}</p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
            {(isCCAUser || isPlatformAdmin) && <ClienteSelectorJvris />}

            {isPlatformAdmin && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={syncNavFromSharePoint.isPending}
                      onClick={() => syncNavFromSharePoint.mutate()}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          syncNavFromSharePoint.isPending ? "animate-spin" : ""
                        }`}
                      />
                      {syncNavFromSharePoint.isPending
                        ? t("financial.syncingNav")
                        : t("financial.syncNav")}
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    {navCache?.synced_at
                      ? `${t("financial.lastSync")}: ${format(
                          new Date(navCache.synced_at),
                          "dd/MM/yyyy HH:mm"
                        )}`
                      : t("financial.noNavDataSync")}
                  </TooltipContent>
                </Tooltip>

                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setConfigForm({
                      tipo_cliente: accountSummary.tipoCliente,
                      prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
                    });
                    setConfigDialogOpen(true);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t("financial.configureClient")}
                </Button>
              </>
            )}
          </div>
        </div>

        {showClienteTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="financeiro">
                <Receipt className="mr-2 h-4 w-4" />
                {t("financial.title")}
              </TabsTrigger>

              <TabsTrigger value="contratos">
                <FileText className="mr-2 h-4 w-4" />
                {t("contracts.title")}
                {contratosCliente.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {contratosCliente.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="ficha">
                <Building2 className="mr-2 h-4 w-4" />
                {t("organization.title")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="financeiro" className="mt-4 space-y-6 min-w-0">
              {tabFinanceiro}
            </TabsContent>

            <TabsContent value="contratos" className="mt-4 min-w-0">
              {tabContratos}
            </TabsContent>

            <TabsContent value="ficha" className="mt-4 min-w-0">
              {tabFicha}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="min-w-0 space-y-6">{tabFinanceiro}</div>
        )}
      </div>

      <Dialog
        open={isJvrisDialogOpen && showJvrisSelector}
        onOpenChange={(open) => {
          if (isConfirmingJvrisSelection || setJvrisId.isPending) return;
          setIsJvrisDialogOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (isConfirmingJvrisSelection || setJvrisId.isPending) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isConfirmingJvrisSelection || setJvrisId.isPending) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("financial.selectJvrisId")}</DialogTitle>
            <DialogDescription>{t("financial.selectJvrisIdDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("financial.searchClientId")}
                value={jvrisSearchQuery}
                onChange={(e) => setJvrisSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-md border">
              {filteredJvrisIds.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {t("financial.noMatchingIds")}
                </p>
              ) : (
                filteredJvrisIds.map((id) => {
                  const normalizedId = String(id).trim();
                  const isSelected = selectedJvrisId === normalizedId;

                  return (
                    <button
                      key={normalizedId}
                      type="button"
                      className={`w-full border-b px-4 py-2.5 text-left font-mono text-sm transition-colors last:border-b-0 hover:bg-muted ${
                        isSelected ? "bg-primary/10 font-semibold text-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedJvrisId(normalizedId);
                      }}
                    >
                      {normalizedId}
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Seleccionado: {selectedJvrisId ?? "nenhum"}</div>
              <div>jvris efectivo da página: {effectiveSelectedJvrisId ?? "null"}</div>
              <div>jvris efectivo do hook: {jvrisId ?? "null"}</div>
              <div>isPending: {String(setJvrisId.isPending)}</div>
              <div>isConfirming: {String(isConfirmingJvrisSelection)}</div>
              <div>isJvrisDialogOpen: {String(isJvrisDialogOpen)}</div>
              <div>organizationId: {organizationId ?? "null"}</div>
              <div>cliente.organizationId: {cliente?.organizationId ?? "null"}</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleConfirmJvrisSelection}
              disabled={!selectedJvrisId || !organizationId || setJvrisId.isPending || isConfirmingJvrisSelection}
            >
              {!selectedJvrisId ? (
                "Sem selecção"
              ) : !organizationId ? (
                "Sem organização"
              ) : isConfirmingJvrisSelection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A confirmar...
                </>
              ) : setJvrisId.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A gravar...
                </>
              ) : (
                t("financial.confirmSelection")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financial.configureClientDialog")}</DialogTitle>
            <DialogDescription>{t("financial.configureClientDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("financial.clientType")}</Label>

              <Select
                value={configForm.tipo_cliente}
                onValueChange={(v) =>
                  setConfigForm({
                    ...configForm,
                    tipo_cliente: v as "pessoa_individual" | "pessoa_coletiva",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="pessoa_individual">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("financial.individualPerson")}
                    </div>
                  </SelectItem>

                  <SelectItem value="pessoa_coletiva">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("financial.legalEntity", { days: "" })}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                {configForm.tipo_cliente === "pessoa_individual"
                  ? t("financial.individualDescription")
                  : t("financial.legalEntityDescription")}
              </p>
            </div>

            {configForm.tipo_cliente === "pessoa_coletiva" && (
              <div className="space-y-2">
                <Label>{t("financial.paymentTerm")}</Label>

                <Select
                  value={configForm.prazo_pagamento_dias}
                  onValueChange={(v) =>
                    setConfigForm({ ...configForm, prazo_pagamento_dias: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="30">30 {t("home.days")}</SelectItem>
                    <SelectItem value="45">45 {t("home.days")}</SelectItem>
                    <SelectItem value="60">60 {t("home.days")}</SelectItem>
                    <SelectItem value="90">90 {t("home.days")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {t("common.cancel")}
            </Button>

            <Button
              onClick={handleUpdateConfig}
              disabled={updateOrganizationFinancial.isPending}
            >
              {updateOrganizationFinancial.isPending
                ? t("financial.saving")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
