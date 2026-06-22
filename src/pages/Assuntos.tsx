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
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import {
  useAssuntos,
  useAssuntoEventos,
  type Assunto,
  type AssuntoEstado,
  type AssuntoTipo,
  type EventoTipo,
} from '@/hooks/useAssuntos';

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
  aberto: 'bg-muted text-muted-foreground',
  em_curso: 'bg-primary/15 text-primary',
  aguarda_cliente: 'bg-risk-medium/20 text-risk-medium',
  concluido: 'bg-risk-low/20 text-risk-low',
  suspenso: 'bg-muted text-muted-foreground',
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
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('matters.cca.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('matters.cca.description')}</p>
          </div>
          {organizationId && (
            <Button className="gap-2" onClick={() => setNovoOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('matters.cca.new')}
            </Button>
          )}
        </header>

        {!organizationId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
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
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Briefcase className="h-8 w-8" strokeWidth={1.5} />
              <span className="text-sm">{t('matters.cca.empty')}</span>
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
  addEvento,
}: {
  assunto: Assunto;
  organizationId: string;
  onEstado: (estado: AssuntoEstado) => void;
  addEvento: ReturnType<typeof useAssuntos>['addEvento'];
}) {
  const { t } = useTranslation();
  const { data: eventos = [] } = useAssuntoEventos(assunto.id);
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{assunto.titulo}</CardTitle>
            <CardDescription className="mt-0.5">
              {t(`portal.matters.tipos.${assunto.tipo}`)}
              {assunto.referencia ? ` · ${assunto.referencia}` : ''}
            </CardDescription>
          </div>
          <Badge className={ESTADO_TONE[estado]}>{t(`portal.matters.estados.${estado}`)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assunto.descricao && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assunto.descricao}</p>
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
        </div>

        {eventos.length > 0 && (
          <ol className="space-y-2 border-t pt-3">
            {eventos.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(e.data).toLocaleDateString('pt-PT')}
                </span>{' '}
                <span className="font-medium">{e.titulo}</span>
                {!e.visivel_cliente && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {t('matters.cca.internal')}
                  </Badge>
                )}
                {e.descricao && <p className="text-muted-foreground">{e.descricao}</p>}
              </li>
            ))}
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
