import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinanceiro, type Invoice, type AccountStatus } from "@/hooks/useFinanceiro";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Receipt, CreditCard, AlertTriangle, CheckCircle, Clock, 
  Download, Eye, Building2, User, Calendar,
  Plus, MoreHorizontal, Settings, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { SharePointDocumentsBrowser } from "@/components/sharepoint/SharePointDocumentsBrowser";

const statusColors: Record<AccountStatus, string> = {
  regularizado: "bg-risk-low/20 text-risk-low border-risk-low/30",
  atencao: "bg-risk-medium/20 text-risk-medium border-risk-medium/30",
  em_atraso: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusIcons: Record<AccountStatus, React.ReactNode> = {
  regularizado: <CheckCircle className="h-5 w-5" />,
  atencao: <AlertTriangle className="h-5 w-5" />,
  em_atraso: <Clock className="h-5 w-5" />,
};

const invoiceStatusColors: Record<string, string> = {
  paga: "bg-risk-low/20 text-risk-low",
  em_aberto: "bg-primary/20 text-primary",
  vencida: "bg-destructive/20 text-destructive",
  em_disputa: "bg-risk-medium/20 text-risk-medium",
};

export default function Financeiro() {
  const { t, i18n } = useTranslation();
  const { 
    invoices, 
    accountSummary, 
    organizationId,
    isLoading, 
    isPlatformAdmin,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    updateOrganizationFinancial
  } = useFinanceiro();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  
  // Dialog states
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  
  // Form states for new invoice
  const [newInvoice, setNewInvoice] = useState({
    numero: "",
    data_emissao: "",
    periodo_inicio: "",
    periodo_fim: "",
    valor: "",
    moeda: "EUR",
    estado: "em_aberto" as Invoice["estado"],
    url_ficheiro: "",
    notas: "",
  });

  // Config form states
  const [configForm, setConfigForm] = useState({
    tipo_cliente: accountSummary.tipoCliente,
    prazo_pagamento_dias: String(accountSummary.prazoPagamentoDias),
  });

  const dateLocale = i18n.language === 'pt' ? pt : enUS;

  const getStatusLabel = (status: AccountStatus) => {
    const labels: Record<AccountStatus, string> = {
      regularizado: t('financial.regularized'),
      atencao: t('financial.attention'),
      em_atraso: t('financial.overdue'),
    };
    return labels[status];
  };

  const getInvoiceStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paga: t('financial.paid'),
      em_aberto: t('financial.open'),
      vencida: t('financial.expired'),
      em_disputa: t('financial.inDispute'),
    };
    return labels[status] || status;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === "all" || inv.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat(i18n.language === 'pt' ? "pt-PT" : "en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleCreateInvoice = () => {
    if (!organizationId || !newInvoice.numero || !newInvoice.data_emissao || !newInvoice.valor) return;
    
    createInvoice.mutate({
      organization_id: organizationId,
      numero: newInvoice.numero,
      data_emissao: newInvoice.data_emissao,
      periodo_inicio: newInvoice.periodo_inicio || null,
      periodo_fim: newInvoice.periodo_fim || null,
      valor: parseFloat(newInvoice.valor),
      moeda: newInvoice.moeda,
      estado: newInvoice.estado,
      url_ficheiro: newInvoice.url_ficheiro || null,
      notas: newInvoice.notas || null,
    }, {
      onSuccess: () => {
        setInvoiceDialogOpen(false);
        setNewInvoice({
          numero: "",
          data_emissao: "",
          periodo_inicio: "",
          periodo_fim: "",
          valor: "",
          moeda: "EUR",
          estado: "em_aberto",
          url_ficheiro: "",
          notas: "",
        });
      }
    });
  };

  const handleUpdateConfig = () => {
    updateOrganizationFinancial.mutate({
      tipo_cliente: configForm.tipo_cliente as "pessoa_individual" | "pessoa_coletiva",
      prazo_pagamento_dias: parseInt(configForm.prazo_pagamento_dias),
    }, {
      onSuccess: () => setConfigDialogOpen(false)
    });
  };

  const handleDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    deleteInvoice.mutate(invoiceToDelete, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setInvoiceToDelete(null);
      }
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
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial.totalInvoices')}</p>
                  <p className="text-lg font-semibold">{accountSummary.totalFaturas}</p>
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-risk-low/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-risk-low" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial.paidCount')}</p>
                  <p className="text-lg font-semibold">{accountSummary.faturasPagas}</p>
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
          </CardContent>
        </Card>

        {/* Faturas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {t('financial.invoices')}
                </CardTitle>
                <CardDescription>{t('financial.invoiceHistory')}</CardDescription>
              </div>
              {isPlatformAdmin && (
                <Button onClick={() => setInvoiceDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('financial.newInvoice')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder={t('financial.searchByNumber')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('financial.all')}</SelectItem>
                  <SelectItem value="paga">{t('financial.paid')}</SelectItem>
                  <SelectItem value="em_aberto">{t('financial.open')}</SelectItem>
                  <SelectItem value="vencida">{t('financial.expired')}</SelectItem>
                  <SelectItem value="em_disputa">{t('financial.inDispute')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('financial.noInvoices')}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('financial.number')}</TableHead>
                      <TableHead>{t('financial.issueDate')}</TableHead>
                      <TableHead>{t('financial.period')}</TableHead>
                      <TableHead>{t('financial.value')}</TableHead>
                      <TableHead>{t('financial.state')}</TableHead>
                      <TableHead className="text-right">{t('financial.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.numero}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.data_emissao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {invoice.periodo_inicio && invoice.periodo_fim ? (
                            <>
                              {format(new Date(invoice.periodo_inicio), "dd/MM/yy")} -{" "}
                              {format(new Date(invoice.periodo_fim), "dd/MM/yy")}
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(invoice.valor), invoice.moeda)}
                        </TableCell>
                        <TableCell>
                          <Badge className={invoiceStatusColors[invoice.estado]}>
                            {getInvoiceStatusLabel(invoice.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" disabled={!invoice.url_ficheiro}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" disabled={!invoice.url_ficheiro}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {isPlatformAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ id: invoice.id, estado: "paga" })}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-risk-low" />
                                    {t('financial.markAsPaid')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ id: invoice.id, estado: "vencida" })}>
                                    <Clock className="mr-2 h-4 w-4 text-destructive" />
                                    {t('financial.markAsOverdue')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ id: invoice.id, estado: "em_disputa" })}>
                                    <AlertTriangle className="mr-2 h-4 w-4 text-risk-medium" />
                                    {t('financial.markAsDispute')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ id: invoice.id, estado: "em_aberto" })}>
                                    <CreditCard className="mr-2 h-4 w-4 text-primary" />
                                    {t('financial.markAsOpen')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      setInvoiceToDelete(invoice.id);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('financial.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totalizador */}
            {filteredInvoices.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t('financial.invoiceCount', { count: filteredInvoices.length })}
                </span>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-2">{t('financial.total')}:</span>
                  <span className="font-bold">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + Number(inv.valor), 0))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SharePoint Documents */}
        <SharePointDocumentsBrowser />
      </div>

      {/* Dialog: Nova Fatura */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('financial.newInvoiceDialog')}</DialogTitle>
            <DialogDescription>{t('financial.newInvoiceDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">{t('financial.invoiceNumber')} *</Label>
                <Input
                  id="numero"
                  placeholder="FAT-001"
                  value={newInvoice.numero}
                  onChange={(e) => setNewInvoice({ ...newInvoice, numero: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_emissao">{t('financial.issueDate')} *</Label>
                <Input
                  id="data_emissao"
                  type="date"
                  value={newInvoice.data_emissao}
                  onChange={(e) => setNewInvoice({ ...newInvoice, data_emissao: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo_inicio">{t('financial.periodStart')}</Label>
                <Input
                  id="periodo_inicio"
                  type="date"
                  value={newInvoice.periodo_inicio}
                  onChange={(e) => setNewInvoice({ ...newInvoice, periodo_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo_fim">{t('financial.periodEnd')}</Label>
                <Input
                  id="periodo_fim"
                  type="date"
                  value={newInvoice.periodo_fim}
                  onChange={(e) => setNewInvoice({ ...newInvoice, periodo_fim: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">{t('financial.value')} *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newInvoice.valor}
                  onChange={(e) => setNewInvoice({ ...newInvoice, valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moeda">{t('financial.currency')}</Label>
                <Select value={newInvoice.moeda} onValueChange={(v) => setNewInvoice({ ...newInvoice, moeda: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">{t('common.status')}</Label>
              <Select value={newInvoice.estado} onValueChange={(v) => setNewInvoice({ ...newInvoice, estado: v as Invoice["estado"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_aberto">{t('financial.open')}</SelectItem>
                  <SelectItem value="paga">{t('financial.paid')}</SelectItem>
                  <SelectItem value="vencida">{t('financial.expired')}</SelectItem>
                  <SelectItem value="em_disputa">{t('financial.inDispute')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url_ficheiro">{t('financial.fileUrl')}</Label>
              <Input
                id="url_ficheiro"
                type="url"
                placeholder="https://..."
                value={newInvoice.url_ficheiro}
                onChange={(e) => setNewInvoice({ ...newInvoice, url_ficheiro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">{t('financial.notes')}</Label>
              <Textarea
                id="notas"
                placeholder={t('financial.notesPlaceholder')}
                value={newInvoice.notas}
                onChange={(e) => setNewInvoice({ ...newInvoice, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateInvoice}
              disabled={!newInvoice.numero || !newInvoice.data_emissao || !newInvoice.valor || createInvoice.isPending}
            >
              {createInvoice.isPending ? t('financial.creating') : t('financial.createInvoice')}
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

      {/* Dialog: Confirmar Eliminação */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('financial.deleteInvoice')}</DialogTitle>
            <DialogDescription>
              {t('financial.deleteInvoiceConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? t('financial.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
