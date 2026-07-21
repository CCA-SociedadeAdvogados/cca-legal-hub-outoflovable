import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { KPI } from '@/components/cca';
import { ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { useTlInstances, useTlTemplates, useCreateTlInstance } from '@/hooks/useTimelines';
import { LawyerTimeline } from '@/components/timelines/LawyerTimeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, Plus, Loader2, MessageSquarePlus } from 'lucide-react';
import { Eyebrow, GoldButton } from '@/components/cca';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import {
  useAssuntos,
  type Assunto,
  type AssuntoEstado,
  type AssuntoTipo,
  type EventoTipo,
} from '@/hooks/useAssuntos';
import { useHubEventos, useUpdateHubEvento, hubEstadoEvento } from '@/hooks/useHub';
import { useJvrisWip } from '@/hooks/useJvrisWip';
import { Switch } from '@/components/ui/switch';

const ESTADOS: AssuntoEstado[] = ['aberto', 'em_curso', 'aguarda_cliente', 'concluido', 'suspenso'];
const TIPOS: AssuntoTipo[] = [
  'contencioso',
  'consultoria',
  'transacao',
  'due_diligence',
  'registo',
  'outro',
];
const EVENTO_TIPOS: EventoTipo[] = ['marco', 'atualizacao', 'documento', 'decisao', 'outro'];

const ESTADO_TONE: Record<AssuntoEstado, string> = {
  aberto: 'border-line bg-bg-alt text-ink-soft',
  em_curso: 'border-brand/30 bg-brand/10 text-brand',
  aguarda_cliente: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium',
  concluido: 'border-positive/30 bg-positive/10 text-positive',
  suspenso: 'border-line bg-bg-alt text-ink-mute',
};

export default function Assuntos() {
  const { t } = useTranslation();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const { viewingOrganizationId } = useCliente();
  const organizationId =
    viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  const { assuntos, isLoading, createAssunto, updateAssunto, addEvento } =
    useAssuntos(organizationId);

  const [novoOpen, setNovoOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<AssuntoTipo>('consultoria');
  const [descricao, setDescricao] = useState('');
  const [referencia, setReferencia] = useState('');

  const criar = async () => {
    if (!titulo.trim()) return;
    await createAssunto.mutateAsync({
      titulo: titulo.trim(),
      tipo,
      descricao: descricao.trim() || null,
      referencia: referencia.trim() || null,
    });
    setTitulo('');
    setDescricao('');
    setReferencia('');
    setTipo('consultoria');
    setNovoOpen(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-7 animate-fade-in">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('nav.matters')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('matters.cca.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('matters.cca.description')}
            </p>
          </header>
          {organizationId && (
            <GoldButton onClick={() => setNovoOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('matters.cca.new')}
            </GoldButton>
          )}
        </div>

        {!organizationId ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="py-10 text-center text-sm text-ink-soft">
              {t('matters.cca.selectClient')}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : assuntos.length === 0 ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <Briefcase className="h-10 w-10 text-ink-mute" strokeWidth={1.5} />
              <span className="text-sm text-ink-soft">{t('matters.cca.empty')}</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <MattersReport organizationId={organizationId} assuntos={assuntos} />
            <div className="space-y-3">
              <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
                {t('matters.report.list', 'Assuntos')}
              </h2>
              {assuntos.map((a) => (
                <CockpitAssuntoCard
                  key={a.id}
                  assunto={a}
                  organizationId={organizationId}
                  onEstado={(estado) => updateAssunto.mutate({ id: a.id, estado })}
                  onPatch={(patch) => updateAssunto.mutate({ id: a.id, ...patch })}
                  addEvento={addEvento}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Novo assunto */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('matters.cca.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.title')}</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.type')}</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as AssuntoTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`portal.matters.tipos.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.reference')}</Label>
              <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.description')}</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={criar} disabled={!titulo.trim() || createAssunto.isPending}>
              {createAssunto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('matters.cca.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

const TIPOS_ALL: AssuntoTipo[] = [
  'contencioso',
  'consultoria',
  'transacao',
  'due_diligence',
  'registo',
  'outro',
];

/**
 * MattersReport — vista de indicadores da carteira de assuntos, inspirada nos
 * relatórios de atividade (KPIs, resumo por tipo, atividade mensal e trabalho
 * executado). Usa dados reais: assuntos + eventos do hub. (As horas dependem do
 * conector JVRIS, ainda não disponível; a métrica de volume é a atividade.)
 */
function MattersReport({
  organizationId,
  assuntos,
}: {
  organizationId: string;
  assuntos: Assunto[];
}) {
  const { t, i18n } = useTranslation();
  const { data: eventos = [] } = useHubEventos(organizationId);
  // Horas reais do JVRIS (cache fact_wip); vazio enquanto o agente não correr.
  const { data: wip = [] } = useJvrisWip(organizationId, 12);
  const hasWip = wip.length > 0;

  const ATIVOS: AssuntoEstado[] = ['aberto', 'em_curso', 'aguarda_cliente'];
  const total = assuntos.length;
  const ativos = assuntos.filter((a) => ATIVOS.includes(a.estado as AssuntoEstado)).length;
  const concluidos = assuntos.filter((a) => a.estado === 'concluido').length;

  const fmtHoras = (h: number) =>
    h.toLocaleString(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Horas: total 12m, média mensal e resumo por dossier (à imagem de A1.2/A1.5)
  const horasTotal = useMemo(() => wip.reduce((s, r) => s + (r.horas_reg ?? 0), 0), [wip]);
  const mesesComRegisto = useMemo(
    () => new Set(wip.map((r) => r.dia.slice(0, 7))).size || 1,
    [wip],
  );
  const porDossier = useMemo(() => {
    const m = new Map<string, { des: string; horas: number }>();
    wip.forEach((r) => {
      const cur = m.get(r.dossier_code) ?? { des: r.dossier_des ?? r.dossier_code, horas: 0 };
      cur.horas += r.horas_reg ?? 0;
      m.set(r.dossier_code, cur);
    });
    return [...m.entries()]
      .map(([code, v]) => ({ code, ...v, pct: horasTotal > 0 ? (v.horas / horasTotal) * 100 : 0 }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);
  }, [wip, horasTotal]);

  const assuntoTitulo = useMemo(() => {
    const m = new Map<string, string>();
    assuntos.forEach((a) => m.set(a.id, a.titulo));
    return m;
  }, [assuntos]);

  // Resumo por tipo (à imagem de "Resumo por dossier/Projeto")
  const porTipo = useMemo(() => {
    const counts = new Map<string, number>();
    assuntos.forEach((a) => counts.set(a.tipo, (counts.get(a.tipo) ?? 0) + 1));
    return TIPOS_ALL.map((tp) => ({
      tipo: tp,
      count: counts.get(tp) ?? 0,
      pct: total > 0 ? ((counts.get(tp) ?? 0) / total) * 100 : 0,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [assuntos, total]);

  // Consumo mensal (à imagem de A1.1) — horas do WIP quando existem; senão
  // nº de eventos como métrica de atividade.
  const meses = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.push({
        key,
        label: d.toLocaleDateString(i18n.language, { month: 'short' }),
        count: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    if (hasWip) {
      wip.forEach((r) => {
        const d = new Date(r.dia);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) buckets[i].count += r.horas_reg ?? 0;
      });
      buckets.forEach((b) => (b.count = Math.round(b.count * 10) / 10));
    } else {
      eventos.forEach((e) => {
        const d = new Date(e.data_evento);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) buckets[i].count++;
      });
    }
    return buckets;
  }, [eventos, wip, hasWip, i18n.language]);
  const maxMes = Math.max(1, ...meses.map((m) => m.count));

  // Trabalho executado (à imagem de A2.1) — registos WIP (Dia · Advogado ·
  // Descrição · Horas) quando existem; senão eventos recentes.
  const trabalho = useMemo(() => eventos.slice(0, 12), [eventos]);
  const trabalhoWip = useMemo(() => wip.slice(0, 15), [wip]);

  return (
    <div className="space-y-5">
      {/* A1 — KPIs (com horas reais do JVRIS quando o agente já sincronizou) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label={t('matters.report.total', 'Total de assuntos')} value={total} />
        <KPI label={t('matters.report.active', 'Ativos')} value={ativos} />
        {hasWip ? (
          <>
            <KPI label={t('matters.report.hours', 'Horas (12 m)')} value={fmtHoras(horasTotal)} />
            <KPI
              label={t('matters.report.monthlyAvg', 'Média mensal (h)')}
              value={fmtHoras(horasTotal / mesesComRegisto)}
            />
          </>
        ) : (
          <>
            <KPI label={t('matters.report.done', 'Concluídos')} value={concluidos} />
            <KPI label={t('matters.report.activity', 'Atualizações')} value={eventos.length} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Resumo por dossier (horas JVRIS, à imagem de A1.2) ou por tipo (fallback) */}
        <Card className="rounded-card border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm text-ink">
              {hasWip
                ? t('matters.report.byDossier', 'Resumo por dossier')
                : t('matters.report.byType', 'Resumo por tipo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-soft text-[10.5px] uppercase tracking-wide text-ink-mute">
                  <th className="pb-2 text-left font-medium">
                    {hasWip
                      ? t('matters.report.dossier', 'Dossier/Projeto')
                      : t('matters.cca.fields.type')}
                  </th>
                  <th className="pb-2 text-right font-medium">
                    {hasWip
                      ? t('matters.report.hoursCol', 'Horas')
                      : t('matters.report.count', 'Nº')}
                  </th>
                  <th className="pb-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {hasWip
                  ? porDossier.map((r) => (
                      <tr key={r.code} className="border-b border-line-soft last:border-0">
                        <td className="max-w-0 truncate py-2 pr-3 text-[13px] text-ink">{r.des}</td>
                        <td className="py-2 text-right font-mono text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                          {fmtHoras(r.horas)}
                        </td>
                        <td className="py-2 text-right font-mono text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                          {r.pct.toFixed(2).replace('.', ',')}%
                        </td>
                      </tr>
                    ))
                  : porTipo.map((r) => (
                      <tr key={r.tipo} className="border-b border-line-soft last:border-0">
                        <td className="py-2 text-[13px] text-ink">
                          {t(`portal.matters.tipos.${r.tipo}`)}
                        </td>
                        <td className="py-2 text-right font-mono text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                          {r.count}
                        </td>
                        <td className="py-2 text-right font-mono text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                          {r.pct.toFixed(1).replace('.', ',')}%
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Atividade mensal */}
        <Card className="rounded-card border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm text-ink">
              {t('matters.report.monthly', 'Atividade mensal')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end justify-between gap-2">
              {meses.map((m) => (
                <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span className="font-mono text-[10px] text-ink-mute [font-variant-numeric:tabular-nums]">
                    {m.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-brand/85 transition-[height]"
                    style={{ height: `${(m.count / maxMes) * 120 + 2}px` }}
                    title={`${m.label}: ${m.count}`}
                  />
                  <span className="text-[10px] capitalize text-ink-mute">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trabalho executado — registos JVRIS (Dia · Advogado · Descrição · Horas,
          à imagem de A2.1) quando existem; senão eventos do hub */}
      {(hasWip ? trabalhoWip.length : trabalho.length) > 0 && (
        <Card className="rounded-card border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm text-ink">
              {t('matters.report.workLog', 'Trabalho executado')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-line-soft text-[10.5px] uppercase tracking-wide text-ink-mute">
                    <th className="pb-2 pr-3 text-left font-medium">
                      {t('matters.report.day', 'Dia')}
                    </th>
                    {hasWip ? (
                      <th className="pb-2 pr-3 text-left font-medium">
                        {t('matters.report.lawyer', 'Advogado')}
                      </th>
                    ) : (
                      <th className="pb-2 pr-3 text-left font-medium">{t('nav.matters')}</th>
                    )}
                    <th className="pb-2 text-left font-medium">
                      {t('matters.cca.fields.description')}
                    </th>
                    {hasWip && (
                      <th className="pb-2 pl-3 text-right font-medium">
                        {t('matters.report.hoursCol', 'Horas')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {hasWip
                    ? trabalhoWip.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-line-soft align-top last:border-0"
                        >
                          <td className="py-2 pr-3 font-mono text-[12px] text-ink-mute [font-variant-numeric:tabular-nums]">
                            {new Date(r.dia).toLocaleDateString(i18n.language, {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 text-[12.5px] text-ink-soft">
                            {r.colab_nome ?? '—'}
                          </td>
                          <td className="py-2 text-[13px] text-ink">
                            {r.dossier_des ?? r.dossier_code}
                          </td>
                          <td className="py-2 pl-3 text-right font-mono text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                            {r.horas_reg != null ? fmtHoras(r.horas_reg) : '—'}
                          </td>
                        </tr>
                      ))
                    : trabalho.map((e) => (
                        <tr
                          key={e.id}
                          className="border-b border-line-soft align-top last:border-0"
                        >
                          <td className="py-2 pr-3 font-mono text-[12px] text-ink-mute [font-variant-numeric:tabular-nums]">
                            {new Date(e.data_evento).toLocaleDateString(i18n.language, {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </td>
                          <td className="py-2 pr-3 text-[12.5px] text-ink-soft">
                            {e.assunto_id ? (assuntoTitulo.get(e.assunto_id) ?? '—') : '—'}
                          </td>
                          <td className="py-2 text-[13px] text-ink">
                            {e.titulo_interno || e.titulo_cliente}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CockpitAssuntoCard({
  assunto,
  organizationId,
  onEstado,
  onPatch,
  addEvento,
}: {
  assunto: Assunto;
  organizationId: string;
  onEstado: (estado: AssuntoEstado) => void;
  onPatch: (patch: Partial<Assunto>) => void;
  addEvento: ReturnType<typeof useAssuntos>['addEvento'];
}) {
  const { t } = useTranslation();
  const { data: eventos = [] } = useHubEventos(organizationId, assunto.id);
  const updateEvento = useUpdateHubEvento(organizationId);
  const estado = (assunto.estado as AssuntoEstado) ?? 'aberto';

  // Timeline do processo — dentro do assunto. Liga uma instância de timeline
  // ao assunto por matter_ref === referência do assunto.
  const { data: tlInstances = [] } = useTlInstances(organizationId);
  const { data: tlTemplates = [] } = useTlTemplates();
  const createTl = useCreateTlInstance();
  const tlInstance = assunto.referencia
    ? tlInstances.find((i) => i.matter_ref === assunto.referencia)
    : undefined;
  const [tlOpen, setTlOpen] = useState(false);
  const [tlTemplateId, setTlTemplateId] = useState('');
  const criarTimeline = async () => {
    if (!tlTemplateId) return;
    await createTl.mutateAsync({
      template_id: tlTemplateId,
      org_id: organizationId,
      matter_ref: assunto.referencia ?? assunto.titulo,
    });
    setTlTemplateId('');
    setTlOpen(true);
  };

  const [open, setOpen] = useState(false);
  const [evTitulo, setEvTitulo] = useState('');
  const [evDescricao, setEvDescricao] = useState('');
  const [evTipo, setEvTipo] = useState<EventoTipo>('atualizacao');
  const [evVisivel, setEvVisivel] = useState<'sim' | 'nao'>('sim');

  const adicionar = async () => {
    if (!evTitulo.trim()) return;
    await addEvento.mutateAsync({
      assunto_id: assunto.id,
      organization_id: organizationId,
      titulo: evTitulo.trim(),
      descricao: evDescricao.trim() || null,
      tipo: evTipo,
      visivel_cliente: evVisivel === 'sim',
    });
    setEvTitulo('');
    setEvDescricao('');
    setEvTipo('atualizacao');
    setEvVisivel('sim');
    setOpen(false);
  };

  return (
    <Card className="rounded-card border-line bg-surface">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-display text-base text-ink">{assunto.titulo}</CardTitle>
            <CardDescription className="mt-0.5">
              {t(`portal.matters.tipos.${assunto.tipo}`)}
              {assunto.referencia ? ` · ${assunto.referencia}` : ''}
            </CardDescription>
            {assunto.pedido_origem_id && (
              <Badge variant="outline" className="mt-1.5 gap-1.5 font-normal">
                <MessageSquarePlus className="h-3 w-3" />
                {t('matters.cca.fromRequest')}
              </Badge>
            )}
          </div>
          <Badge className={ESTADO_TONE[estado]}>{t(`portal.matters.estados.${estado}`)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assunto.descricao && (
          <p className="whitespace-pre-wrap text-sm text-ink-soft">{assunto.descricao}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Select value={estado} onValueChange={(v) => onEstado(v as AssuntoEstado)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {t(`portal.matters.estados.${e}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <MessageSquarePlus className="h-3.5 w-3.5" />
            {t('matters.cca.addUpdate')}
          </Button>
          {/* F2: publicação opt-in — nada é publicado por defeito */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-mute">{t('hub.publishedInPortal')}</span>
            <Switch
              checked={assunto.publicado}
              onCheckedChange={(v) => onPatch({ publicado: v })}
            />
          </div>
        </div>

        {/* F2: ponto de situação cliente-friendly (texto curado) */}
        <div className="flex items-center gap-2">
          <Input
            defaultValue={assunto.status_cliente ?? ''}
            placeholder={t('hub.statusClientePlaceholder')}
            className="h-8 text-sm"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== (assunto.status_cliente ?? null)) onPatch({ status_cliente: v });
            }}
          />
        </div>

        {eventos.length > 0 && (
          <ol className="space-y-2 border-t border-line pt-3">
            {eventos.map((e) => {
              const estadoEv = hubEstadoEvento(e.data_evento, e.concluido);
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-ink-mute [font-variant-numeric:tabular-nums]">
                      {new Date(e.data_evento).toLocaleDateString('pt-PT')}
                    </span>{' '}
                    <span className="font-medium text-ink">{e.titulo_cliente}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {t(`hub.tipos.${e.tipo}`)}
                    </Badge>
                    {estadoEv === 'vencido' && (
                      <Badge className="ml-1.5 border-risk-high/30 bg-risk-high/10 text-[10px] text-risk-high">
                        {t('hub.estados.vencido')}
                      </Badge>
                    )}
                    {!e.publicado && (
                      <Badge variant="outline" className="ml-1.5 text-[10px]">
                        {t('matters.cca.internal')}
                      </Badge>
                    )}
                    {(e.descricao_cliente || e.descricao_interna) && (
                      <p className="text-ink-soft">{e.descricao_cliente ?? e.descricao_interna}</p>
                    )}
                  </div>
                  {/* Curadoria inline: publicar/ocultar (eventos internos nunca são publicáveis) */}
                  {!e.interno && (
                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      title={t('hub.publishToggle')}
                    >
                      <Switch
                        checked={e.publicado}
                        onCheckedChange={(v) => updateEvento.mutate({ id: e.id, publicado: v })}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Timeline do processo — dentro do assunto */}
        <div className="border-t border-line pt-3">
          {tlInstance ? (
            <>
              <button
                type="button"
                onClick={() => setTlOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand transition-colors hover:text-brand/80"
              >
                {tlOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <ListChecks className="h-3.5 w-3.5" />
                {t('matters.cca.timeline', 'Timeline do processo')}
              </button>
              {tlOpen && (
                <div className="mt-3">
                  <LawyerTimeline instanceId={tlInstance.id} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-mute">
                {t('matters.cca.noTimeline', 'Sem timeline neste processo')}
              </span>
              <div className="w-56">
                <Select value={tlTemplateId} onValueChange={setTlTemplateId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue
                      placeholder={t('matters.cca.chooseTemplate', 'Escolher modelo…')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tlTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={!tlTemplateId || createTl.isPending}
                onClick={criarTimeline}
              >
                {createTl.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListChecks className="h-3.5 w-3.5" />
                )}
                {t('matters.cca.createTimeline', 'Criar timeline')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('matters.cca.addUpdate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.title')}</Label>
              <Input value={evTitulo} onChange={(e) => setEvTitulo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('matters.cca.fields.type')}</Label>
                <Select value={evTipo} onValueChange={(v) => setEvTipo(v as EventoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENTO_TIPOS.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`portal.matters.eventoTipos.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('matters.cca.fields.visibility')}</Label>
                <Select value={evVisivel} onValueChange={(v) => setEvVisivel(v as 'sim' | 'nao')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">{t('matters.cca.visibleClient')}</SelectItem>
                    <SelectItem value="nao">{t('matters.cca.internal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('matters.cca.fields.description')}</Label>
              <Textarea
                value={evDescricao}
                onChange={(e) => setEvDescricao(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={adicionar} disabled={!evTitulo.trim() || addEvento.isPending}>
              {addEvento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('matters.cca.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
