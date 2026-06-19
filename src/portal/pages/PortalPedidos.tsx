import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquarePlus,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Hourglass,
} from 'lucide-react';
import { Eyebrow } from '@/components/cca';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useContratos } from '@/hooks/useContratos';
import {
  usePedidos,
  type Pedido,
  type PedidoEstado,
  type PedidoTipo,
  type PedidoPrioridade,
} from '@/hooks/usePedidos';
import { formatDate } from '@/portal/lib/contrato';

const ESTADO_META: Record<PedidoEstado, { tone: string; icon: React.ElementType }> = {
  pendente: { tone: 'border-line bg-bg-alt text-ink-soft', icon: Hourglass },
  em_analise: { tone: 'border-warn/40 bg-warn/10 text-warn', icon: Clock },
  concluido: { tone: 'border-risk-low/40 bg-risk-low/10 text-risk-low', icon: CheckCircle2 },
  cancelado: { tone: 'border-line bg-bg-alt text-ink-mute', icon: XCircle },
};

const TIPOS: PedidoTipo[] = ['conformidade', 'revisao_clausulas', 'due_diligence', 'outro'];
const PRIORIDADES: PedidoPrioridade[] = ['urgente', 'normal', 'baixa'];

export default function PortalPedidos() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const { contratos } = useContratos();
  const { pedidos, isLoading, createPedido, cancelPedido } = usePedidos(currentOrganization?.id);

  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<PedidoTipo>('outro');
  const [prioridade, setPrioridade] = useState<PedidoPrioridade>('normal');
  const [contratoId, setContratoId] = useState<string>('none');

  const reset = () => {
    setTitulo('');
    setDescricao('');
    setTipo('outro');
    setPrioridade('normal');
    setContratoId('none');
  };

  const submit = async () => {
    if (!titulo.trim()) return;
    await createPedido.mutateAsync({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo_analise: tipo,
      prioridade,
      contrato_id: contratoId === 'none' ? null : contratoId,
    });
    reset();
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Eyebrow>{t('portal.pages.requests.eyebrow')}</Eyebrow>
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
            {t('portal.pages.requests.title')}
          </h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
            {t('portal.pages.requests.description')}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          {t('portal.requests.new')}
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <MessageSquarePlus className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.requests.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <PedidoCard
              key={p.id}
              pedido={p}
              lang={i18n.language}
              onCancel={() => cancelPedido.mutate(p.id)}
              canceling={cancelPedido.isPending}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('portal.requests.new')}</DialogTitle>
            <DialogDescription>{t('portal.requests.formHint')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pedido-titulo">{t('portal.requests.fields.subject')}</Label>
              <Input
                id="pedido-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={t('portal.requests.fields.subjectPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('portal.requests.fields.type')}</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as PedidoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`portal.requests.types.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('portal.requests.fields.priority')}</Label>
                <Select
                  value={prioridade}
                  onValueChange={(v) => setPrioridade(v as PedidoPrioridade)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((pr) => (
                      <SelectItem key={pr} value={pr}>
                        {t(`portal.requests.priorities.${pr}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('portal.requests.fields.contract')}</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('portal.requests.fields.noContract')}</SelectItem>
                  {(contratos ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo_contrato}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pedido-desc">{t('portal.requests.fields.description')}</Label>
              <Textarea
                id="pedido-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                placeholder={t('portal.requests.fields.descriptionPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={submit} disabled={!titulo.trim() || createPedido.isPending}>
              {createPedido.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('portal.requests.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PedidoCard({
  pedido,
  lang,
  onCancel,
  canceling,
}: {
  pedido: Pedido;
  lang: string;
  onCancel: () => void;
  canceling: boolean;
}) {
  const { t } = useTranslation();
  const estado = (pedido.estado as PedidoEstado) ?? 'pendente';
  const meta = ESTADO_META[estado] ?? ESTADO_META.pendente;
  const Icon = meta.icon;
  const canCancel = estado === 'pendente' || estado === 'em_analise';

  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-medium leading-snug text-ink">
            {pedido.titulo}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-ink-mute">
            {t(`portal.requests.types.${pedido.tipo_analise as PedidoTipo}`)} ·{' '}
            {formatDate(pedido.created_at, lang)}
          </p>
        </div>
        <Badge variant="outline" className={cn('shrink-0 gap-1 text-xs', meta.tone)}>
          <Icon className="h-3 w-3" strokeWidth={2} />
          {t(`portal.requests.estados.${estado}`)}
        </Badge>
      </div>

      {pedido.descricao && (
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
          {pedido.descricao}
        </p>
      )}

      {pedido.resposta && (
        <div className="mt-3 rounded-control border border-brand/30 bg-brand/[0.05] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
            {t('portal.requests.response')}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
            {pedido.resposta}
          </p>
        </div>
      )}

      {canCancel && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={canceling}>
            {t('portal.requests.cancel')}
          </Button>
        </div>
      )}
    </article>
  );
}
