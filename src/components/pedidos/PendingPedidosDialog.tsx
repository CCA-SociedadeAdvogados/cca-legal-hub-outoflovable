import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Loader2, MessageSquarePlus, Paperclip, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Pedido = Tables<'on_demand_requests'>;

interface PendingPedido extends Pedido {
  organizationName: string;
}

const DISMISSED_KEY = 'cca-pending-pedidos-dismissed';

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Popup persistente do cockpit com os pedidos de clientes por tratar.
 *
 * Abre automaticamente para utilizadores CCA enquanto houver pedidos
 * pendentes: fechá-lo apenas o silencia na sessão do separador — volta a
 * aparecer na próxima sessão (e imediatamente quando chega um pedido novo).
 * Só desaparece de vez quando alguém carrega em "Tratar", que passa o pedido
 * a "Em análise" com o próprio como responsável.
 */
export function PendingPedidosDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCCAInternalAuthorized } = useOrganizations();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [treatingId, setTreatingId] = useState<string | null>(null);

  const { data: pendentes = [] } = useQuery({
    queryKey: ['pending-pedidos-dialog'],
    enabled: !!user && isCCAInternalAuthorized,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async (): Promise<PendingPedido[]> => {
      const { data: pedidos, error } = await supabase
        .from('on_demand_requests')
        .select('*')
        .eq('estado', 'pendente')
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      if (!pedidos || pedidos.length === 0) return [];

      const orgIds = [...new Set(pedidos.map((p) => p.organization_id))];
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);
      const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

      return pedidos.map((p) => ({
        ...p,
        organizationName: orgName.get(p.organization_id) ?? '—',
      }));
    },
  });

  const pendingIds = useMemo(() => pendentes.map((p) => p.id).join(','), [pendentes]);

  // Abrir quando existir algum pendente ainda não silenciado nesta sessão.
  useEffect(() => {
    if (pendentes.length === 0) {
      setOpen(false);
      return;
    }
    const dismissed = readDismissed();
    if (pendentes.some((p) => !dismissed.has(p.id))) setOpen(true);
    // pendingIds muda quando a lista de pendentes muda — reavalia a abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(pendentes.map((p) => p.id)));
    setOpen(false);
  };

  const treat = useMutation({
    mutationFn: async (pedido: PendingPedido) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const { error } = await supabase
        .from('on_demand_requests')
        .update({ estado: 'em_analise', responsavel_id: user.id })
        .eq('id', pedido.id);
      if (error) throw error;

      // Marcar como lida a notificação correspondente do próprio utilizador.
      supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('reference_id', pedido.id)
        .eq('read', false)
        .then(() => {});
    },
    onSuccess: () => {
      toast({ title: t('requests.cca.pendingTreated') });
      queryClient.invalidateQueries({ queryKey: ['pending-pedidos-dialog'] });
      queryClient.invalidateQueries({ queryKey: ['pending-pedidos-badge'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e: Error) => {
      toast({
        title: t('requests.cca.pendingTreatError'),
        description: e.message,
        variant: 'destructive',
      });
    },
    onSettled: () => setTreatingId(null),
  });

  const openAttachment = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('politicas').createSignedUrl(path, 600);
      if (error || !data?.signedUrl) throw error ?? new Error('no url');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: t('requests.cca.attachmentError'), variant: 'destructive' });
    }
  };

  if (!isCCAInternalAuthorized) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            {t('requests.cca.pendingTitle', { count: pendentes.length })}
          </DialogTitle>
          <DialogDescription>{t('requests.cca.pendingDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {pendentes.map((p) => (
            <div key={p.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{p.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.organizationName} · {t(`portal.requests.types.${p.tipo_analise}`)} ·{' '}
                    {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {p.origem === 'politica' && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ShieldCheck className="h-3 w-3" />
                      {t('requests.cca.policyBadge')}
                    </Badge>
                  )}
                  {p.prioridade === 'urgente' && (
                    <Badge className="bg-danger text-white text-xs">
                      {t('portal.requests.priorities.urgente')}
                    </Badge>
                  )}
                </div>
              </div>

              {p.descricao && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                  {p.descricao}
                </p>
              )}

              <div className="mt-2.5 flex items-center justify-between gap-2">
                {p.anexo_path ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => openAttachment(p.anexo_path!)}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {t('requests.cca.attachment')}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={treat.isPending}
                  onClick={() => {
                    setTreatingId(p.id);
                    treat.mutate(p);
                  }}
                >
                  {treat.isPending && treatingId === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {t('requests.cca.pendingTreat')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={dismiss}>
            {t('requests.cca.pendingLater')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              dismiss();
              navigate('/pedidos');
            }}
          >
            {t('requests.cca.pendingOpenPage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
