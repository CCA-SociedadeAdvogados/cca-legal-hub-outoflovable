import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Download, Building2, Calendar, Euro, User, Shield, FileText, Clock, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { ValidationBadge } from '@/components/contracts/ValidationBadge';
import { useContractExtractions } from '@/hooks/useContractExtractions';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useContrato } from '@/hooks/useContratos';
import { useCCAStatus } from '@/hooks/useCCAStatus';
import { TIPO_CONTRATO_LABELS, ESTADO_CONTRATO_LABELS, DEPARTAMENTO_LABELS, TIPO_DURACAO_LABELS, TIPO_RENOVACAO_LABELS, ESTRUTURA_PRECOS_LABELS, PERIODICIDADE_FATURACAO_LABELS, PAPEL_ENTIDADE_LABELS } from '@/types/contracts';
import { ContractTimeline } from '@/components/contracts/ContractTimeline';
import { ContractAttachments } from '@/components/contracts/ContractAttachments';
import { ContratoLegislacao } from '@/components/contracts/ContratoLegislacao';
import { ContractComplianceResults } from '@/components/contracts/ContractComplianceResults';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { CheckCircle2, XCircle, Globe } from 'lucide-react';

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: React.ElementType }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function BooleanBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <Badge variant={value ? 'active' : 'secondary'} className="mr-2 mb-2">
      {value ? '✓' : '✗'} {label}
    </Badge>
  );
}

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: contrato, isLoading } = useContrato(id);
  const { validationStatus, triggerCCAValidation } = useContractExtractions(id);
  const { isLocal } = useLegalHubProfile();
  useCCAStatus(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!contrato) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Contrato não encontrado</h2>
          <Button asChild className="mt-4"><Link to="/contratos">Voltar à lista</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const daysUntilExpiry = contrato.data_termo ? differenceInDays(new Date(contrato.data_termo), new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;

  const formatCurrency = (value?: number) => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: contrato.moeda || 'EUR', minimumFractionDigits: 0 }).format(value);
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '—';
    return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: pt });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild><Link to="/contratos"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {!isLocal && <Badge variant="outline" className="font-mono">{contrato.id_interno}</Badge>}
                {!isLocal && <Badge variant={contrato.estado_contrato === 'activo' ? 'active' : 'secondary'}>{ESTADO_CONTRATO_LABELS[contrato.estado_contrato]}</Badge>}
                {isExpiringSoon && <Badge variant="riskMedium"><AlertTriangle className="h-3 w-3 mr-1" />Expira em {daysUntilExpiry} dias</Badge>}
                <ValidationBadge status={(contrato.validation_status ?? 'none') as any} />
              </div>
              <h1 className="text-2xl font-bold font-serif">{contrato.titulo_contrato}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{contrato.parte_b_nome_legal}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(validationStatus === 'failed' || validationStatus === 'needs_review' || validationStatus === 'draft_only') && (
              <Button
                variant="outline"
                size="sm"
                disabled={triggerCCAValidation.isPending}
                onClick={() => {
                  triggerCCAValidation.mutate({ reuseExistingDraft: true });
                }}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${triggerCCAValidation.isPending ? 'animate-spin' : ''}`} />
                {validationStatus === 'failed' ? 'Reprocessar no CCA' : 'Revalidar no CCA'}
              </Button>
            )}
            <Button variant="outline"><Download className="mr-2 h-4 w-4" />Exportar</Button>
            <Button asChild><Link to={`/contratos/${id}/editar`}><Edit className="mr-2 h-4 w-4" />Editar</Link></Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className={`grid w-full ${isLocal ? 'grid-cols-4' : 'grid-cols-5'}`}>
            <TabsTrigger value="geral">Contrato</TabsTrigger>
            <TabsTrigger value="partes">Partes</TabsTrigger>
            {!isLocal && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
            <TabsTrigger value="conformidade">{isLocal ? 'RGPD' : 'Conformidade'}</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow label="Tipo" value={TIPO_CONTRATO_LABELS[contrato.tipo_contrato]} icon={FileText} />
                  {!isLocal && <InfoRow label="Departamento" value={DEPARTAMENTO_LABELS[contrato.departamento_responsavel]} />}
                  {!isLocal && <InfoRow label="Responsável ID" value={contrato.responsavel_interno_id} icon={User} />}
                  <Separator className="my-3" />
                  <p className="text-sm text-muted-foreground">Objecto</p>
                  <p>{contrato.objeto_resumido}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Datas e Duração</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {!isLocal && <InfoRow label="Assinatura Parte A" value={formatDate(contrato.data_assinatura_parte_a)} icon={Calendar} />}
                  {!isLocal && <InfoRow label="Assinatura Parte B" value={formatDate(contrato.data_assinatura_parte_b)} icon={Calendar} />}
                  <InfoRow label="Início Vigência" value={formatDate(contrato.data_inicio_vigencia)} icon={Clock} />
                  <InfoRow label="Termo" value={formatDate(contrato.data_termo)} icon={Clock} />
                  <Separator className="my-3" />
                  <InfoRow label="Duração" value={TIPO_DURACAO_LABELS[contrato.tipo_duracao]} />
                  <InfoRow label="Renovação" value={TIPO_RENOVACAO_LABELS[contrato.tipo_renovacao]} />
                  {contrato.renovacao_periodo_meses && <InfoRow label="Período Renovação" value={`${contrato.renovacao_periodo_meses} meses`} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="partes" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Parte A (Organização)</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Nome Legal" value={contrato.parte_a_nome_legal} icon={Building2} />
                  <InfoRow label="NIF" value={contrato.parte_a_nif} />
                  <InfoRow label="Morada" value={contrato.parte_a_morada} />
                  <InfoRow label="País" value={contrato.parte_a_pais} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Parte B (Contraparte)</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Nome Legal" value={contrato.parte_b_nome_legal} icon={Building2} />
                  <InfoRow label="NIF" value={contrato.parte_b_nif} />
                  <InfoRow label="Grupo Económico" value={contrato.parte_b_grupo_economico} />
                  <InfoRow label="Morada" value={contrato.parte_b_morada} />
                  <InfoRow label="País" value={contrato.parte_b_pais} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-lg">Contactos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><p className="text-sm text-muted-foreground mb-1">Comercial</p><p className="font-medium">{contrato.contacto_comercial_nome || '—'}</p><p className="text-sm">{contrato.contacto_comercial_email}</p></div>
                  <div><p className="text-sm text-muted-foreground mb-1">Operacional</p><p className="font-medium">{contrato.contacto_operacional_nome || '—'}</p><p className="text-sm">{contrato.contacto_operacional_email}</p></div>
                  <div><p className="text-sm text-muted-foreground mb-1">Facturação</p><p className="font-medium">{contrato.contacto_faturacao_nome || '—'}</p><p className="text-sm">{contrato.contacto_faturacao_email}</p></div>
                  <div><p className="text-sm text-muted-foreground mb-1">Legal</p><p className="font-medium">{contrato.contacto_legal_nome || '—'}</p><p className="text-sm">{contrato.contacto_legal_email}</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {!isLocal && (
          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Valores</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Valor Total Estimado" value={formatCurrency(contrato.valor_total_estimado)} icon={Euro} />
                  <InfoRow label="Valor Anual Recorrente" value={formatCurrency(contrato.valor_anual_recorrente)} />
                  <InfoRow label="Estrutura de Preços" value={ESTRUTURA_PRECOS_LABELS[contrato.estrutura_precos]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Facturação</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Periodicidade" value={contrato.periodicidade_faturacao ? PERIODICIDADE_FATURACAO_LABELS[contrato.periodicidade_faturacao] : undefined} />
                  <InfoRow label="Prazo Pagamento" value={contrato.prazo_pagamento_dias ? `${contrato.prazo_pagamento_dias} dias` : undefined} />
                  <InfoRow label="Centro de Custo" value={contrato.centro_custo} />
                  <InfoRow label="Nº Encomenda" value={contrato.numero_encomenda_po} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          <TabsContent value="conformidade" className="space-y-6">
            {isLocal ? (
              /* Client view: simplified read-only RGPD indicators */
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" />RGPD e Protecção de Dados</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Indicadores detectados automaticamente pelo Agente CCA após análise do documento.
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      {contrato.tratamento_dados_pessoais
                        ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      }
                      <div>
                        <p className="font-medium text-sm">Dados pessoais detectados</p>
                        <p className="text-xs text-muted-foreground">{contrato.tratamento_dados_pessoais ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      {contrato.existe_dpa_anexo_rgpd
                        ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      }
                      <div>
                        <p className="font-medium text-sm">DPA detectado</p>
                        <p className="text-xs text-muted-foreground">{contrato.existe_dpa_anexo_rgpd ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      {contrato.transferencia_internacional
                        ? <Globe className="h-5 w-5 text-amber-500 shrink-0" />
                        : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      }
                      <div>
                        <p className="font-medium text-sm">Transferência internacional detectada</p>
                        <p className="text-xs text-muted-foreground">{contrato.transferencia_internacional ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Internal view: full compliance section */
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Cláusulas e Garantias</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap mb-4">
                        <BooleanBadge value={contrato.flag_confidencialidade} label="Confidencialidade" />
                        <BooleanBadge value={contrato.flag_nao_concorrencia} label="Não Concorrência" />
                        <BooleanBadge value={contrato.flag_exclusividade} label="Exclusividade" />
                        <BooleanBadge value={contrato.flag_direito_subcontratar} label="Subcontratação" />
                        <BooleanBadge value={contrato.clausula_indemnizacao} label="Indemnização" />
                        <BooleanBadge value={contrato.garantia_existente} label="Garantia" />
                      </div>
                      {contrato.garantia_existente && (
                        <>
                          <InfoRow label="Tipo Garantia" value={contrato.garantia_tipo} />
                          <InfoRow label="Valor Garantia" value={formatCurrency(contrato.garantia_valor)} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" />RGPD e Privacidade</CardTitle></CardHeader>
                    <CardContent>
                      <BooleanBadge value={contrato.tratamento_dados_pessoais} label="Tratamento Dados" />
                      <BooleanBadge value={contrato.existe_dpa_anexo_rgpd} label="DPA Existente" />
                      <BooleanBadge value={contrato.transferencia_internacional} label="Transf. Internacional" />
                      {contrato.tratamento_dados_pessoais && (
                        <>
                          <Separator className="my-3" />
                          <InfoRow label="Papel da Entidade" value={contrato.papel_entidade ? PAPEL_ENTIDADE_LABELS[contrato.papel_entidade] : undefined} />
                          <InfoRow label="Categorias Dados" value={contrato.categorias_dados_pessoais} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Legislação Aplicável */}
                <ContratoLegislacao contratoId={id || ''} />

                {/* Análise de Conformidade IA */}
                <ContractComplianceResults contratoId={id || ''} />
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Linha Temporal</CardTitle></CardHeader>
                <CardContent><ContractTimeline contratoId={id || ''} canEdit estadoContrato={contrato.estado_contrato} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Anexos</CardTitle></CardHeader>
                <CardContent><ContractAttachments contratoId={id || ''} canEdit /></CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
