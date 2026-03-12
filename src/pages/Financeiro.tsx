import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFinanceiro, type AccountStatus } from '@/hooks/useFinanceiro';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Contrato = Tables<'contratos'>;

const statusColors: Record<AccountStatus, string> = {
  em_dia: 'bg-risk-low/20 text-risk-low border-risk-low/30',
  em_aberto: 'bg-gray-100 dark:bg-gray-800 text-risk-medium border-risk-medium/30',
  em_incumprimento: 'bg-gray-100 dark:bg-gray-800 text-destructive border-destructive/30',
};

const statusIcons: Record<AccountStatus, ReactNode> = {
  em_dia: <CheckCircle className="h-5 w-5" />,
  em_aberto: <AlertTriangle className="h-5 w-5" />,
  em_incumprimento: <Clock className="h-5 w-5" />,
};

export default function Financeiro() {
  const { t } = useTranslation();
  const { isCCAUser } = useLegalHubProfile();

  const {
    organizationId,
    accountSummary,
    organizationInfo,
    financialSummary,
    financialItems,
    financialByEntity,
    navError,
    isLoading,
    isLoadingNav,
    isPlatformAdmin,
  } = useFinanceiro();

  const [activeTab, setActiveTab] = useState('financeiro');

  const { data: contratosCliente = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ['contratos-org-cliente', organizationId],
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select(
          'id, titulo_contrato, tipo_contrato, estado_contrato, data_inicio, data_termo, parte_b_nome_legal, valor_total_estimado, nivel_risco',
        )
        .eq('organization_id', organizationId!)
        .eq('arquivado', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Contrato[];
    },
    enabled: !!organizationId && (isCCAUser || isPlatformAdmin),
    staleTime: 30 * 1000,
  });

  const { data: orgCliente, isLoading: isLoadingOrgCliente } = useQuery({
    queryKey: ['org-ficha', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(
          'id, name, slug, jvris_id, tipo_cliente, prazo_pagamento_dias, logo_url, industry_sectors, created_at',
        )
        .eq('id', organizationId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && (isCCAUser || isPlatformAdmin),
    staleTime: 60 * 1000,
  });

  const getStatusLabel = (status: AccountStatus) => {
    const labels: Record<AccountStatus, string> = {
      em_dia: t('financial.emDia'),
      em_aberto: t('financial.emAberto'),
      em_incumprimento: t('financial.inDefault'),
    };
    return labels[status];
  };

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency,
    }).format(value ?? 0);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('pt-PT');
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-PT');
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

  if (!organizationId) {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Sem cliente seleccionado.
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
                  {t('financial.accountStatus')}: {getStatusLabel(accountSummary.status)}
                </span>
              </CardTitle>

              <CardDescription className="mt-1 flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {organizationInfo?.legacy_client_name || organizationInfo?.organization_name || 'Cliente'}
                </span>
              </CardDescription>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm text-muted-foreground">{t('financial.totalOpen')}</p>
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
                <p className="text-sm text-muted-foreground">{t('financial.totalInDefault')}</p>
                <p className="text-lg font-semibold">
                  {financialSummary?.total_documentos ?? 0}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t('financial.openAmount')}</p>
                <p className="text-lg font-semibold">{financialItems.filter((i) => i.estado === 'a_vencer').length}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-destructive/20 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t('financial.overdueCount')}</p>
                <p className="text-lg font-semibold">{financialItems.filter((i) => i.estado === 'vencido').length}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
              <p className="mt-1 font-medium">{organizationInfo?.client_code || '—'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Grupo</p>
              <p className="mt-1 font-medium">{organizationInfo?.group_code || 'NAO'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Centro de custo</p>
              <p className="mt-1 font-medium">{organizationInfo?.cost_center || '—'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsável</p>
              <p className="mt-1 font-medium">{organizationInfo?.responsible || '—'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Última sincronização</p>
              <p className="mt-1 font-medium">{formatDateTime(organizationInfo?.ultima_sincronizacao)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por entidade</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="w-full min-w-0 overflow-x-auto rounded-md border">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-right">Vencido</TableHead>
                    <TableHead className="text-right">A vencer</TableHead>
                    <TableHead>Última sincronização</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoadingNav ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`entity-skeleton-${i}`}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : financialByEntity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                        Sem dados por entidade.
                      </TableCell>
                    </TableRow>
                  ) : (
                    financialByEntity.map((row) => (
                      <TableRow key={row.entity_organization_id}>
                        <TableCell className="font-medium">{row.entity_name}</TableCell>
                        <TableCell>{row.entity_client_code}</TableCell>
                        <TableCell>{row.group_code || 'NAO'}</TableCell>
                        <TableCell>{row.total_documentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_pendente)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_vencido)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_a_vencer)}</TableCell>
                        <TableCell>{formatDateTime(row.ultima_sincronizacao)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('financial.title')}</CardTitle>
          <CardDescription>Documentos financeiros do cliente seleccionado</CardDescription>
        </CardHeader>

        <CardContent>
          {navError && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Erro ao carregar os documentos financeiros.</span>
            </div>
          )}

          <div className="w-full min-w-0 overflow-x-auto rounded-md border">
            <div className="min-w-[860px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('financial.invoiceNumber')}</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>{t('financial.dueDate')}</TableHead>
                    <TableHead className="text-right">{t('financial.amount')}</TableHead>
                    <TableHead>{t('financial.invoiceStatus')}</TableHead>
                    <TableHead>Sincronização</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoadingNav ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`item-skeleton-${i}`}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : financialItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        <Receipt className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>{t('financial.noInvoices')}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    financialItems.map((item, index) => (
                      <TableRow key={`${item.numero_documento ?? 'doc'}-${index}`}>
                        <TableCell className="font-mono text-sm">
                          {item.numero_documento || '—'}
                        </TableCell>
                        <TableCell>{item.descricao || '—'}</TableCell>
                        <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell>
                          {item.estado === 'vencido' ? (
                            <Badge variant="destructive" className="text-xs">
                              {t('financial.overdue')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t('financial.withinTerm')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(item.synced_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
          <span className="truncate">{t('contracts.title')}</span>
        </CardTitle>
        <CardDescription className="truncate">
          {organizationInfo?.legacy_client_name || organizationInfo?.organization_name || ''}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="w-full min-w-0 overflow-x-auto rounded-md border">
          <div className="min-w-[720px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contracts.title')}</TableHead>
                  <TableHead>{t('contracts.type')}</TableHead>
                  <TableHead>{t('contracts.status')}</TableHead>
                  <TableHead>{t('contracts.endDate')}</TableHead>
                  <TableHead>{t('contracts.risk')}</TableHead>
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
                      <p>{t('dashboard.noContracts')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  contratosCliente.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {c.titulo_contrato}
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {c.tipo_contrato?.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {c.estado_contrato?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.data_termo ? new Date(c.data_termo).toLocaleDateString('pt-PT') : '—'}
                      </TableCell>
                      <TableCell>
                        {c.nivel_risco && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              c.nivel_risco === 'alto'
                                ? 'border-risk-high/50 text-risk-high'
                                : c.nivel_risco === 'medio'
                                  ? 'border-risk-medium/50 text-risk-medium'
                                  : 'border-risk-low/50 text-risk-low'
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
          {t('organization.title')}
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
                  Código cliente
                </p>
                <p className="font-mono font-medium">{organizationInfo?.client_code || '—'}</p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('financial.clientType')}
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <Building2 className="h-4 w-4" />
                  Pessoa colectiva
                </p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Grupo
                </p>
                <p className="font-medium">{organizationInfo?.group_code || 'NAO'}</p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Responsável
                </p>
                <p className="font-medium">{organizationInfo?.responsible || '—'}</p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email responsável
                </p>
                <p className="font-medium">{organizationInfo?.responsible_email || '—'}</p>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Última sincronização
                </p>
                <p className="font-medium">{formatDateTime(organizationInfo?.ultima_sincronizacao)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('dashboard.noData')}</p>
        )}
      </CardContent>
    </Card>
  );

  const showClienteTabs = !!(organizationId && (isCCAUser || isPlatformAdmin));

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-bold text-foreground">{t('financial.title')}</h1>
            <p className="truncate text-muted-foreground">{t('financial.subtitle')}</p>
          </div>
        </div>

        {showClienteTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="financeiro">
                <Receipt className="mr-2 h-4 w-4" />
                {t('financial.title')}
              </TabsTrigger>

              <TabsTrigger value="contratos">
                <FileText className="mr-2 h-4 w-4" />
                {t('contracts.title')}
                {contratosCliente.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {contratosCliente.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="ficha">
                <Building2 className="mr-2 h-4 w-4" />
                {t('organization.title')}
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
    </AppLayout>
  );
}
