import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, Download, Loader2 } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/portal/lib/contrato';

interface PortalPolitica {
  id: string;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  departamento: string | null;
  versao: number;
  updated_at: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
}

/**
 * Políticas publicadas pela CCA para o cliente (apenas estado "aprovada"),
 * em leitura. O cliente pode ver o conteúdo e descarregar o ficheiro associado.
 */
export default function PortalPoliticas() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const orgId = currentOrganization?.id;
  const [viewing, setViewing] = useState<PortalPolitica | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: politicas = [], isLoading } = useQuery({
    queryKey: queryKeys.politicas.byOrg(orgId ?? 'none'),
    enabled: !!orgId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PortalPolitica[]> => {
      const { data, error } = await supabase
        .from('politicas')
        .select(
          'id, titulo, descricao, conteudo, departamento, versao, updated_at, arquivo_url, arquivo_nome',
        )
        .eq('organization_id', orgId!)
        .eq('estado', 'aprovada')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PortalPolitica[];
    },
  });

  const download = async (p: PortalPolitica) => {
    if (!p.arquivo_url) return;
    setDownloadingId(p.id);
    try {
      const { data, error } = await supabase.storage
        .from('politicas')
        .createSignedUrl(p.arquivo_url, 600);
      if (error || !data?.signedUrl) throw error ?? new Error('no url');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: t('portal.policies.downloadError'), variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.policies.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.policies.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.policies.description')}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : politicas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface/50 py-16 text-center">
          <ShieldCheck className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-mute">{t('portal.policies.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {politicas.map((p) => (
            <article key={p.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[15px] font-medium leading-snug text-ink">
                    {p.titulo}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-mute">
                    {t('portal.policies.version', { n: p.versao })} ·{' '}
                    {formatDate(p.updated_at, i18n.language)}
                  </p>
                </div>
                {p.departamento && (
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {p.departamento}
                  </Badge>
                )}
              </div>

              {p.descricao && (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{p.descricao}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {p.conteudo && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setViewing(p)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t('portal.policies.read')}
                  </Button>
                )}
                {p.arquivo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => download(p)}
                    disabled={downloadingId === p.id}
                  >
                    {downloadingId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {t('portal.policies.download')}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={viewing !== null} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
            {viewing?.conteudo}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
