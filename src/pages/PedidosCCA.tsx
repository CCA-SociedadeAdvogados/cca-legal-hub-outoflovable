import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { usePedidos, type Pedido, type PedidoEstado } from '@/hooks/usePedidos';

const ESTADO_TONE: Record<PedidoEstado, string> = {
  pendente: 'bg-muted text-muted-foreground',
  em_analise: 'bg-risk-medium/20 text-risk-medium',
  concluido: 'bg-risk-low/20 text-risk-low',
  cancelado: 'bg-muted text-muted-foreground',
};

const ESTADOS: PedidoEstado[] = ['pendente', 'em_analise', 'concluido', 'cancelado'];

export default function PedidosCCA() {
  const { t } = useTranslation();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const { viewingOrganizationId } = useCliente();

  const organizationId =
    viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  const { pedidos, isLoading, respondPedido } = usePedidos(organizationId);

  const [editing, setEditing] = useState<Pedido | null>(null);
  const [resposta, setResposta] = useState('');
  const [estado, setEstado] = useState<PedidoEstado>('em_analise');

  const openRespond = (p: Pedido) => {
    setEditing(p);
    setResposta(p.resposta ?? '');
    setEstado((p.estado as PedidoEstado) ?? 'em_analise');
  };

  const save = async () => {
    if (!editing) return;
    await respondPedido.mutateAsync({
      id: editing.id,
      resposta: resposta.trim() || undefined,
      estado,
    });
    setEditing(null);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t('requests.cca.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('requests.cca.description')}</p>
        </header>

        {!organizationId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t('requests.cca.selectClient')}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <MessageSquarePlus className="h-8 w-8" strokeWidth={1.5} />
              <span className="text-sm">{t('requests.cca.empty')}</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const est = (p.estado as PedidoEstado) ?? 'pendente';
              return (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{p.titulo}</CardTitle>
                        <CardDescription className="mt-0.5">
                          {t(`portal.requests.types.${p.tipo_analise}`)} ·{' '}
                          {t(`portal.requests.priorities.${p.prioridade}`)}
                        </CardDescription>
                      </div>
                      <Badge className={ESTADO_TONE[est]}>
                        {t(`portal.requests.estados.${est}`)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.descricao && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {p.descricao}
                      </p>
                    )}
                    {p.resposta && (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('portal.requests.response')}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{p.resposta}</p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => openRespond(p)}>
                        {t('requests.cca.respond')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('requests.cca.state')}</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as PedidoEstado)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {t(`portal.requests.estados.${e}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resposta">{t('portal.requests.response')}</Label>
              <Textarea
                id="resposta"
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                rows={5}
                placeholder={t('requests.cca.responsePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={save} disabled={respondPedido.isPending}>
              {respondPedido.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
