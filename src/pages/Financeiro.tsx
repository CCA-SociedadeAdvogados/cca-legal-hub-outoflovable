import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Receipt, CreditCard, AlertTriangle, CheckCircle, Clock,
  Building2, User, Calendar,
  Settings, RefreshCw, Search, Loader2
} from "lucide-react";
import { SharePointDocumentsBrowser } from "@/components/sharepoint/SharePointDocumentsBrowser";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";

const statusColors: Record<AccountStatus, string> = {
  regularizado: "bg-risk-low/20 text-risk-low border-risk-low/30",
  pendente: "bg-risk-medium/20 text-risk-medium border-risk-medium/30",
  em_incumprimento: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusIcons: Record<AccountStatus, React.ReactNode> = {
  regularizado: <CheckCircle className="h-5 w-5" />,
  pendente: <AlertTriangle className="h-5 w-5" />,
  em_incumprimento: <Clock className="h-5 w-5" />,
};

export default function Financeiro() {
  const { t, i18n } = useTranslation();
  const {
    accountSummary,
    navCache,
    navItems,
    jvrisId,
    availableJvrisIds,
    lastSyncResult,
    isLoading,
    isPlatformAdmin,
    updateOrganizationFinancial,
    syncNavFromSharePoint,
    setJvrisId
  } = useFinanceiro();

  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [jvrisSearchQuery, setJvrisSearchQuery] = useState("");
  const [selectedJvrisId, setSelectedJvrisId] = useState<string | null>(null);

  // Show jvris_id selection dialog when org has no jvris_id and there are available IDs
  const hasAvailableIds = (lastSyncResult?.jvris_ids?.length ?? 0) > 1 || availableJvrisIds.length > 1;
  const showJvrisSelector = !jvrisId && hasAvailableIds && isPlatformAdmin;

  const filteredJvrisIds = useMemo(() => {
    // Prefer lastSyncResult (fresh from sync), fall back to DB query
    const ids = (lastSyncResult?.jvris_ids?.length ?? 0) > 0
      ? lastSyncResult!.jvris_ids!
      : availableJvrisIds;
    if (!jvrisSearchQuery.trim()) return ids;
    const q = jvrisSearchQuery.trim().toLowerCase();
    return ids.filter((id) => id.toLowerCase().includes(q));
  }, [lastSyncResult, availableJvrisIds, jvrisSearchQuery]);

  // Config form states
  const [configForm, setConfigForm] = useState({
    tipo_cliente: accountSummary.tipoCliente,
    prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
  });

  const dateLocale = i18n.language === 'pt' ? pt : enUS;

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
      regularizado: t('financial.regularized'),
      pendente: t('financial.pending'),
      em_incumprimento: t('financial.inDefault'),
    };
    return labels[status];
  };

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat(i18n.language === 'pt' ? "pt-PT" : "en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleUpdateConfig = () => {
    updateOrganizationFinancial.mutate({
      tipo_cliente: configForm.tipo_cliente as "pessoa_individual" | "pessoa_coletiva",
      prazo_pagamento_dias: parseInt(configForm.prazo_pagamento_dias),
    }, {
      onSuccess: () => setConfigDialogOpen(false)
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('financial.title')}</h1>
            <p className="text-muted-foreground">{t('financial.subtitle')}</p>
          </div>
          {isPlatformAdmin && (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncNavFromSharePoint.isPending}
                    onClick={() => syncNavFromSharePoint.mutate()}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncNavFromSharePoint.isPending ? "animate-spin" : ""}`} />
                    {syncNavFromSharePoint.isPending ? t('financial.syncingNav') : t('financial.syncNav')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {navCache?.synced_at
                    ? `${t('financial.lastSync')}: ${format(new Date(navCache.synced_at), "dd/MM/yyyy HH:mm")}`
                    : t('financial.noNavDataSync')}
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" onClick={() => {
                setConfigForm({
                  tipo_cliente: accountSummary.tipoCliente,
                  prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
                });
                setConfigDialogOpen(true);
              }}>
                <Settings className="mr-2 h-4 w-4" />
                {t('financial.configureClient')}
              </Button>
            </div>
          )}
        </div>

        {/* Resumo da Conta Corrente */}
        <Card className={`border-2 ${statusColors[accountSummary.status]}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {statusIcons[accountSummary.status]}
                  {t('financial.accountStatus')}: {getStatusLabel(accountSummary.status)}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {accountSummary.tipoCliente === "pessoa_individual" ? (
                    <>
                      <User className="h-4 w-4" />
                      {t('financial.individualPerson')}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      {t('financial.legalEntity', { days: accountSummary.prazoPagamentoDias })}
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('financial.totalOpen')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(accountSummary.totalEmAberto)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Contadores */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial.totalInDefault')}</p>
                  <p className="text-lg font-semibold">{accountSummary.totalFaturasEmIncumprimento}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial.openAmount')}</p>
                  <p className="text-lg font-semibold">{accountSummary.faturasEmAberto}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial.overdueCount')}</p>
                  <p className="text-lg font-semibold">{accountSummary.faturasVencidas}</p>
                </div>
              </div>
            </div>

            {accountSummary.proximoVencimento && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('financial.nextDue')}:</span>
                <span className="font-medium">
                  {format(accountSummary.proximoVencimento, i18n.language === 'pt' ? "dd 'de' MMMM 'de' yyyy" : "MMMM d, yyyy", { locale: dateLocale })}
                </span>
              </div>
            )}

            {/* Lista de faturas */}
            {(navItems.length > 0 || (navCache && navCache.valor_pendente != null && navCache.valor_pendente > 0)) && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{t('financial.pendingInvoices')}: <strong className="text-foreground">{accountSummary.totalFaturasEmIncumprimento}</strong></span>
                  {accountSummary.faturasVencidas > 0 && (
                    <span className="text-destructive">{accountSummary.faturasVencidas} {t('financial.overdue')}</span>
                  )}
                  {accountSummary.faturasEmAberto > 0 && (
                    <span className="text-primary">{accountSummary.faturasEmAberto} {t('financial.withinTerm')}</span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('financial.invoiceNumber')}</TableHead>
                        <TableHead>{t('financial.dueDate')}</TableHead>
                        <TableHead className="text-right">{t('financial.amount')}</TableHead>
                        <TableHead>{t('financial.invoiceStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {navItems.length > 0 ? (
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
                                  {t('financial.overdue')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {t('financial.withinTerm')}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : navCache && navCache.valor_pendente != null && navCache.valor_pendente > 0 ? (
                        <TableRow>
                          <TableCell className="font-mono text-sm">{t('financial.pendingBalance')}</TableCell>
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
                                {t('financial.overdue')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t('financial.withinTerm')}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Arquivo SharePoint */}
        <SharePointDocumentsBrowser />

      </div>

      {/* Dialog: Selecionar ID Jvris */}
      <Dialog open={!!showJvrisSelector} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('financial.selectJvrisId')}</DialogTitle>
            <DialogDescription>
              {t('financial.selectJvrisIdDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('financial.searchClientId')}
                value={jvrisSearchQuery}
                onChange={(e) => setJvrisSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {filteredJvrisIds.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {t('financial.noMatchingIds')}
                </p>
              ) : (
                filteredJvrisIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm font-mono hover:bg-muted transition-colors border-b last:border-b-0 ${
                      selectedJvrisId === id ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                    onClick={() => setSelectedJvrisId(id)}
                  >
                    {id}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedJvrisId) {
                  setJvrisId.mutate(selectedJvrisId);
                }
              }}
              disabled={!selectedJvrisId || setJvrisId.isPending}
            >
              {setJvrisId.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('financial.selecting')}
                </>
              ) : (
                t('financial.confirmSelection')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Cliente */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('financial.configureClientDialog')}</DialogTitle>
            <DialogDescription>
              {t('financial.configureClientDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('financial.clientType')}</Label>
              <Select 
                value={configForm.tipo_cliente} 
                onValueChange={(v) => setConfigForm({ ...configForm, tipo_cliente: v as "pessoa_individual" | "pessoa_coletiva" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa_individual">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('financial.individualPerson')}
                    </div>
                  </SelectItem>
                  <SelectItem value="pessoa_coletiva">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('financial.legalEntity', { days: '' })}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {configForm.tipo_cliente === "pessoa_individual" 
                  ? t('financial.individualDescription')
                  : t('financial.legalEntityDescription')}
              </p>
            </div>
            
            {configForm.tipo_cliente === "pessoa_coletiva" && (
              <div className="space-y-2">
                <Label>{t('financial.paymentTerm')}</Label>
                <Select 
                  value={configForm.prazo_pagamento_dias} 
                  onValueChange={(v) => setConfigForm({ ...configForm, prazo_pagamento_dias: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 {t('home.days')}</SelectItem>
                    <SelectItem value="45">45 {t('home.days')}</SelectItem>
                    <SelectItem value="60">60 {t('home.days')}</SelectItem>
                    <SelectItem value="90">90 {t('home.days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUpdateConfig}
              disabled={updateOrganizationFinancial.isPending}
            >
              {updateOrganizationFinancial.isPending ? t('financial.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
