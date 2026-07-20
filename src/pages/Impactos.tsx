import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImpactos } from '@/hooks/useImpactos';
import { useEventosLegislativos } from '@/hooks/useEventosLegislativos';
import { useContratos } from '@/hooks/useContratos';
import {
  AlertTriangle,
  Search,
  Plus,
  FileCheck,
  Scale,
  Loader2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUploadWithAI } from '@/components/shared/DocumentUploadWithAI';
import { Eyebrow, KPI, GoldButton } from '@/components/cca';

export default function Impactos() {
  const { t } = useTranslation();

  const NIVEL_RISCO_LABELS: Record<string, string> = {
    baixo: t('risk.low'),
    medio: t('risk.medium'),
    alto: t('risk.high'),
  };

  const ESTADO_IMPACTO_LABELS: Record<string, string> = {
    pendente_analise: t('status.pendingAnalysis'),
    em_tratamento: t('status.inTreatment'),
    resolvido: t('status.resolved'),
    ignorado: t('status.ignored'),
  };

  const { impactos, isLoading, stats, createImpacto, updateImpacto } = useImpactos();
  const { eventos } = useEventosLegislativos();
  const { contratos } = useContratos();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState<{
    evento_legislativo_id: string;
    contrato_id: string;
    nivel_risco: 'baixo' | 'medio' | 'alto';
    descricao: string;
    observacoes: string;
  }>({
    evento_legislativo_id: '',
    contrato_id: '',
    nivel_risco: 'medio',
    descricao: '',
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      evento_legislativo_id: '',
      contrato_id: '',
      nivel_risco: 'medio',
      descricao: '',
      observacoes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createImpacto.mutateAsync({
      ...formData,
      contrato_id: formData.contrato_id || null,
    });

    setDialogOpen(false);
    resetForm();
  };

  const handleUpdateEstado = async (id: string, novoEstado: 'em_tratamento' | 'resolvido') => {
    await updateImpacto.mutateAsync({ id, estado: novoEstado });
  };

  const filteredImpactos =
    impactos?.filter(
      (impacto) =>
        impacto.eventos_legislativos?.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        impacto.contratos?.titulo_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        impacto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) ?? [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-7 animate-fade-in">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('impacts.title')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('impacts.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('impacts.subtitle')}
            </p>
          </header>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <GoldButton onClick={resetForm}>
                <Plus className="h-4 w-4" />
                {t('impacts.newImpact')}
              </GoldButton>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('impacts.newImpact')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <DocumentUploadWithAI
                  context="impacto"
                  compact
                  onAnalysisComplete={(result) => {
                    const dados = result.dados_extraidos || {};
                    setFormData((prev) => ({
                      ...prev,
                      descricao: result.resumo || prev.descricao,
                      nivel_risco:
                        (dados.nivel_risco as 'baixo' | 'medio' | 'alto') || prev.nivel_risco,
                      observacoes: result.recomendacoes?.join('\n') || prev.observacoes,
                    }));
                  }}
                />
                <div>
                  <Label htmlFor="evento_legislativo_id">{t('impacts.relatedEvent')} *</Label>
                  <Select
                    value={formData.evento_legislativo_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, evento_legislativo_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('impacts.selectEvent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {eventos?.map((evento) => (
                        <SelectItem key={evento.id} value={evento.id}>
                          {evento.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contrato_id">{t('impacts.relatedContract')}</Label>
                  <Select
                    value={formData.contrato_id}
                    onValueChange={(value) => setFormData({ ...formData, contrato_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('impacts.selectContract')} />
                    </SelectTrigger>
                    <SelectContent>
                      {contratos?.map((contrato) => (
                        <SelectItem key={contrato.id} value={contrato.id}>
                          {contrato.id_interno} - {contrato.titulo_contrato}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nivel_risco">{t('impacts.riskLevel')}</Label>
                  <Select
                    value={formData.nivel_risco}
                    onValueChange={(value: typeof formData.nivel_risco) =>
                      setFormData({ ...formData, nivel_risco: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NIVEL_RISCO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descricao">{t('impacts.description')}</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">{t('impacts.observations')}</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createImpacto.isPending || !formData.evento_legislativo_id}
                  >
                    {createImpacto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('common.register')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <KPI label={t('common.total')} value={stats.total} />
          <KPI label={t('impacts.highRisk')} value={stats.alto} className="border-risk-high/30" />
          <KPI
            label={t('impacts.mediumRisk')}
            value={stats.medio}
            className="border-risk-medium/30"
          />
          <KPI label={t('common.pending')} value={stats.pendentes} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <Input
            placeholder={t('impacts.searchImpacts')}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredImpactos.length === 0 ? (
            <Card className="rounded-card border-line bg-surface">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <AlertTriangle className="h-12 w-12 text-ink-mute" strokeWidth={1.5} />
                <p className="text-sm text-ink-soft">
                  {searchTerm ? t('impacts.noImpacts') : t('impacts.noImpactsRegistered')}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredImpactos.map((impacto) => (
              <Card
                key={impacto.id}
                className="rounded-card border-line bg-surface transition-colors hover:border-brand/40 group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                          impacto.nivel_risco === 'alto'
                            ? 'bg-risk-high/10'
                            : impacto.nivel_risco === 'medio'
                              ? 'bg-risk-medium/10'
                              : 'bg-risk-low/10'
                        }`}
                      >
                        <AlertTriangle
                          className={`h-6 w-6 ${
                            impacto.nivel_risco === 'alto'
                              ? 'text-risk-high'
                              : impacto.nivel_risco === 'medio'
                                ? 'text-risk-medium'
                                : 'text-risk-low'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge
                            variant={
                              impacto.nivel_risco === 'alto'
                                ? 'riskHigh'
                                : impacto.nivel_risco === 'medio'
                                  ? 'riskMedium'
                                  : 'riskLow'
                            }
                          >
                            {t('risk.' + impacto.nivel_risco)}{' '}
                            {t('impacts.riskLevel').toLowerCase()}
                          </Badge>
                          <Badge
                            variant={
                              impacto.estado === 'pendente_analise'
                                ? 'pending'
                                : impacto.estado === 'em_tratamento'
                                  ? 'subtle'
                                  : impacto.estado === 'resolvido'
                                    ? 'active'
                                    : 'secondary'
                            }
                          >
                            {ESTADO_IMPACTO_LABELS[impacto.estado]}
                          </Badge>
                        </div>

                        {impacto.eventos_legislativos && (
                          <div className="flex items-center gap-2 mb-2">
                            <Scale className="h-4 w-4 text-ink-mute" />
                            <span className="text-sm font-medium text-ink">
                              {impacto.eventos_legislativos.titulo}
                            </span>
                            {impacto.eventos_legislativos.referencia_legal && (
                              <Badge variant="outline" className="text-xs">
                                {impacto.eventos_legislativos.referencia_legal}
                              </Badge>
                            )}
                          </div>
                        )}

                        {impacto.contratos && (
                          <div className="flex items-center gap-2 mb-2">
                            <FileCheck className="h-4 w-4 text-ink-mute" />
                            <Link
                              to={`/contratos/${impacto.contratos.id}`}
                              className="text-sm text-ink-soft hover:text-brand hover:underline"
                            >
                              {t('contracts.contract')}: {impacto.contratos.id_interno} -{' '}
                              {impacto.contratos.titulo_contrato}
                            </Link>
                          </div>
                        )}

                        {impacto.descricao && (
                          <p className="text-sm text-ink-soft mt-2">{impacto.descricao}</p>
                        )}

                        {impacto.observacoes && (
                          <p className="text-sm text-ink-mute mt-1 italic">{impacto.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {impacto.estado === 'pendente_analise' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateEstado(impacto.id, 'em_tratamento')}
                          disabled={updateImpacto.isPending}
                        >
                          <Clock className="mr-1 h-4 w-4" />
                          {t('common.start')}
                        </Button>
                      )}
                      {impacto.estado === 'em_tratamento' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateEstado(impacto.id, 'resolvido')}
                          disabled={updateImpacto.isPending}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          {t('common.finish')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
