import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="mx-auto max-w-4xl space-y-7 animate-fade-in">
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
          <div className="space-y-3">
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
