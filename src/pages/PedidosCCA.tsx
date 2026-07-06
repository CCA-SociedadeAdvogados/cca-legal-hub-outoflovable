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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageSquarePlus, Loader2, Briefcase, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCCALawyers } from '@/hooks/useCCALawyers';
import { useCliente } from '@/contexts/ClienteContext';
import { usePedidos, type Pedido, type PedidoEstado } from '@/hooks/usePedidos';
import { useAssuntos } from '@/hooks/useAssuntos';

const ESTADO_TONE: Record<PedidoEstado, string> = {
  pendente: 'bg-muted text-muted-foreground',
  em_analise: 'bg-risk-medium/20 text-risk-medium',
  concluido: 'bg-risk-low/20 text-risk-low',
  cancelado: 'bg-muted text-muted-foreground',
};

const ESTADOS: PedidoEstado[] = ['pendente', 'em_analise', 'concluido', 'cancelado'];

// O anexo vive na coluna anexo_path; o parsing da linha "Ficheiro anexo: …"
// na descrição cobre apenas registos criados antes da migração 20260706120000.
const LEGACY_ATTACHMENT_RE = /(?:^|\n)Ficheiro anexo: (\S+)/;

function parseDescricao(
  descricao: string | null,
  anexoPath: string | null,
): { text: string | null; attachment: string | null } {
  if (!descricao) return { text: null, attachment: anexoPath };
  const m = descricao.match(LEGACY_ATTACHMENT_RE);
  if (!m) return { text: descricao, attachment: anexoPath };
  return { text: descricao.replace(m[0], '').trim() || null, attachment: anexoPath ?? m[1] };
}

export default function PedidosCCA() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const { viewingOrganizationId } = useCliente();
  const { data: lawyers = [] } = useCCALawyers();

  const organizationId =
    viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  const { pedidos, isLoading, respondPedido, promoteToAssunto } = usePedidos(organizationId);
  const { assuntos } = useAssuntos(organizationId);

  // Pedidos que já foram promovidos a assunto (para não duplicar).
  const promotedPedidoIds = new Set(
    assuntos.map((a) => a.pedido_origem_id).filter((id): id is string => !!id),
  );

  const [editing, setEditing] = useState<Pedido | null>(null);
  const [resposta, setResposta] = useState('');
  const [estado, setEstado] = useState<PedidoEstado>('em_analise');
  const [responsavelId, setResponsavelId] = useState<string>('');
  const [promoting, setPromoting] = useState<Pedido | null>(null);

  // Garantir que o responsável actual (ou o próprio) aparece como opção,
  // mesmo que não conste da lista de advogados SSO.
  const lawyerOptions = (() => {
    const opts = [...lawyers];
    for (const id of [editing?.responsavel_id, user?.id]) {
      if (id && !opts.some((l) => l.id === id)) {
        opts.unshift({
          id,
          nome_completo: id === user?.id ? t('requests.cca.me') : t('requests.cca.responsible'),
          email: null,
          avatar_url: null,
        });
      }
    }
    return opts;
  })();

  const openRespond = (p: Pedido) => {
    setEditing(p);
    setResposta(p.resposta ?? '');
    setEstado((p.estado as PedidoEstado) ?? 'em_analise');
    setResponsavelId(p.responsavel_id ?? user?.id ?? '');
  };

  const openAttachment = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('politicas').createSignedUrl(path, 600);
      if (error || !data?.signedUrl) throw error ?? new Error('no url');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: t('requests.cca.attachmentError'), variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!editing) return;
    await respondPedido.mutateAsync({
      id: editing.id,
      resposta: resposta.trim() || undefined,
      estado,
      responsavel_id: responsavelId || undefined,
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
              const { text: descricaoText, attachment } = parseDescricao(p.descricao, p.anexo_path);
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
                    {descricaoText && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {descricaoText}
                      </p>
                    )}
                    {attachment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openAttachment(attachment)}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {t('requests.cca.attachment')}
                      </Button>
                    )}
                    {p.resposta && (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('portal.requests.response')}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{p.resposta}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      {promotedPedidoIds.has(p.id) ? (
                        <Badge variant="outline" className="gap-1.5 font-normal">
                          <Briefcase className="h-3.5 w-3.5" />
                          {t('requests.cca.promoted')}
                        </Badge>
                      ) : (
                        est !== 'cancelado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() => setPromoting(p)}
                          >
                            <Briefcase className="h-3.5 w-3.5" />
                            {t('requests.cca.promote')}
                          </Button>
                        )
                      )}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Label>{t('requests.cca.responsible')}</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('requests.cca.responsible')} />
                  </SelectTrigger>
                  <SelectContent>
                    {lawyerOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome_completo || l.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      <AlertDialog open={promoting !== null} onOpenChange={(v) => !v && setPromoting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('requests.cca.promoteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('requests.cca.promoteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!promoting) return;
                await promoteToAssunto.mutateAsync(promoting);
                setPromoting(null);
              }}
            >
              {t('requests.cca.promote')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
