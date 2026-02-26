import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Building2, Search, RefreshCw, CheckCircle, Clock, AlertCircle, Info, ExternalLink } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import {
  useBusinessCentralConfig,
  useBusinessCentralCustomers,
  useBusinessCentralLedger,
  type BCCustomer,
  type BCLedgerEntry,
} from "@/hooks/useBusinessCentral";

type LedgerFilter = "all" | "open" | "closed";

const documentTypeLabels: Record<string, string> = {
  Invoice: "Fatura",
  Payment: "Pagamento",
  "Credit Memo": "Nota de Crédito",
  Reminder: "Aviso",
  "Finance Charge Memo": "Nota de Encargos",
  Refund: "Reembolso",
};

export function BCContaCorrente() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? pt : enUS;

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<BCCustomer | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const [showCustomerList, setShowCustomerList] = useState(false);

  const { data: config, isLoading: isLoadingConfig } = useBusinessCentralConfig();
  const { data: customers = [], isLoading: isLoadingCustomers, refetch: refetchCustomers } = useBusinessCentralCustomers(search);
  const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useBusinessCentralLedger({
    customerBcId: selectedCustomer?.id,
    isOpen: ledgerFilter === "open" ? true : ledgerFilter === "closed" ? false : undefined,
  });

  const formatCurrency = (value: number | null, currency = "EUR") => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat(i18n.language === "pt" ? "pt-PT" : "en-US", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  };

  const getDocTypeLabel = (docType: string | null) => {
    if (!docType) return "—";
    return documentTypeLabels[docType] || docType;
  };

  const getEntryStatusBadge = (entry: BCLedgerEntry) => {
    if (!entry.is_open) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("businessCentral.ledger.settled", "Liquidado")}
        </Badge>
      );
    }

    const isOverdue = entry.due_date && isPast(parseISO(entry.due_date));
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t("businessCentral.ledger.overdue", "Vencido")}
        </Badge>
      );
    }

    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Clock className="h-3 w-3 mr-1" />
        {t("businessCentral.ledger.open", "Em aberto")}
      </Badge>
    );
  };

  const filteredCustomers = customers.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.bc_number && c.bc_number.toLowerCase().includes(search.toLowerCase())) ||
    (c.nif && c.nif.includes(search))
  );

  const totalBalance = ledgerEntries
    .filter((e) => e.is_open)
    .reduce((sum, e) => sum + (e.remaining_amount || 0), 0);

  const overdueBalance = ledgerEntries
    .filter((e) => e.is_open && e.due_date && isPast(parseISO(e.due_date)))
    .reduce((sum, e) => sum + (e.remaining_amount || 0), 0);

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config || !config.is_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("businessCentral.title", "Conta Corrente — Business Central")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{t("businessCentral.notConfigured.title", "Integração não configurada")}</AlertTitle>
            <AlertDescription>
              {t(
                "businessCentral.notConfigured.description",
                "A integração com o Business Central ainda não está ativa. Configure-a nas Definições para visualizar a conta corrente dos clientes."
              )}
              <Button variant="link" className="h-auto p-0 ml-1" asChild>
                <a href="/definicoes">
                  {t("businessCentral.notConfigured.goToSettings", "Ir para Definições")}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("businessCentral.title", "Conta Corrente — Business Central")}
            </CardTitle>
            <CardDescription>
              {config.company_name
                ? t("businessCentral.connectedTo", "{{company}} · última sync: {{date}}", {
                    company: config.company_name,
                    date: config.last_sync_at
                      ? format(new Date(config.last_sync_at), "dd/MM/yyyy HH:mm")
                      : t("businessCentral.neverSynced", "nunca"),
                  })
                : t("businessCentral.neverSynced", "Nunca sincronizado")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {config.last_sync_status === "success" && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t("businessCentral.status.synced", "Sincronizado")}
              </Badge>
            )}
            {config.last_sync_status === "error" && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t("businessCentral.status.error", "Erro")}
              </Badge>
            )}
            {config.last_sync_status === "running" && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {t("businessCentral.status.syncing", "A sincronizar...")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Search */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("businessCentral.searchCustomer", "Pesquisar cliente por nome, número ou NIF...")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowCustomerList(true);
                }}
                onFocus={() => setShowCustomerList(true)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchCustomers()}
              disabled={isLoadingCustomers}
              title={t("businessCentral.refresh", "Atualizar lista")}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCustomers ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Customer Dropdown */}
          {showCustomerList && search.length >= 1 && (
            <div className="border rounded-md shadow-sm bg-background max-h-64 overflow-y-auto">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t("businessCentral.noCustomersFound", "Nenhum cliente encontrado")}
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setSearch(customer.display_name);
                      setShowCustomerList(false);
                      setLedgerFilter("all");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{customer.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.bc_number && <span className="mr-2">#{customer.bc_number}</span>}
                          {customer.nif && <span>NIF: {customer.nif}</span>}
                        </p>
                      </div>
                      {customer.balance !== null && (
                        <p className={`text-sm font-semibold ${customer.balance > 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatCurrency(customer.balance, customer.currency_code || "EUR")}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-base">{selectedCustomer.display_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {selectedCustomer.bc_number && (
                      <span>{t("businessCentral.customer.number", "Nº Cliente")}: {selectedCustomer.bc_number}</span>
                    )}
                    {selectedCustomer.nif && (
                      <span>NIF: {selectedCustomer.nif}</span>
                    )}
                    {selectedCustomer.city && (
                      <span>{selectedCustomer.city}, {selectedCustomer.country}</span>
                    )}
                    {selectedCustomer.email && (
                      <span>{selectedCustomer.email}</span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground">{t("businessCentral.customer.openBalance", "Saldo em aberto")}</p>
                  <p className={`text-xl font-bold ${totalBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                    {formatCurrency(totalBalance, selectedCustomer.currency_code || "EUR")}
                  </p>
                  {overdueBalance > 0 && (
                    <p className="text-xs text-destructive">
                      {t("businessCentral.customer.overdueBalance", "Vencido")}: {formatCurrency(overdueBalance, selectedCustomer.currency_code || "EUR")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {(["all", "open", "closed"] as LedgerFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={ledgerFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLedgerFilter(f)}
                >
                  {f === "all" && t("businessCentral.filter.all", "Todos")}
                  {f === "open" && t("businessCentral.filter.open", "Em aberto")}
                  {f === "closed" && t("businessCentral.filter.closed", "Liquidados")}
                </Button>
              ))}
            </div>

            {/* Ledger Table */}
            {isLoadingLedger ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ledgerEntries.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  {t("businessCentral.ledger.noEntries", "Sem lançamentos para este cliente")}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("businessCentral.ledger.postingDate", "Data Lançamento")}</TableHead>
                      <TableHead>{t("businessCentral.ledger.documentType", "Tipo Doc.")}</TableHead>
                      <TableHead>{t("businessCentral.ledger.documentNumber", "Nº Doc.")}</TableHead>
                      <TableHead>{t("businessCentral.ledger.description", "Descrição")}</TableHead>
                      <TableHead className="text-right">{t("businessCentral.ledger.amount", "Montante")}</TableHead>
                      <TableHead className="text-right">{t("businessCentral.ledger.remainingAmount", "Montante Restante")}</TableHead>
                      <TableHead>{t("businessCentral.ledger.dueDate", "Vencimento")}</TableHead>
                      <TableHead>{t("businessCentral.ledger.status", "Estado")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {entry.posting_date
                            ? format(parseISO(entry.posting_date), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getDocTypeLabel(entry.document_type)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {entry.document_number || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {entry.description || "—"}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-semibold ${(entry.amount || 0) < 0 ? "text-green-600" : ""}`}>
                          {formatCurrency(entry.amount, entry.currency_code || "EUR")}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {entry.is_open
                            ? formatCurrency(entry.remaining_amount, entry.currency_code || "EUR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.due_date
                            ? format(parseISO(entry.due_date), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {getEntryStatusBadge(entry)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {ledgerEntries.length > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t">
                <span>
                  {t("businessCentral.ledger.count", "{{count}} lançamento(s)", { count: ledgerEntries.length })}
                </span>
                {ledgerFilter !== "closed" && (
                  <span>
                    {t("businessCentral.ledger.totalOpen", "Total em aberto")}: <strong className="text-foreground">{formatCurrency(totalBalance, selectedCustomer.currency_code || "EUR")}</strong>
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {!selectedCustomer && !isLoadingCustomers && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{t("businessCentral.searchHint", "Pesquise e selecione um cliente para ver a sua conta corrente")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
