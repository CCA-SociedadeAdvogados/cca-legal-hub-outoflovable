import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  FileText,
  Download,
  Loader2,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
  ArrowRight,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, safeFileName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { usePedidos, type PedidoEstado } from '@/hooks/usePedidos';
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

/** Prefixo que identifica pedidos originados por submissão de políticas. */
export const POLICY_REQUEST_PREFIX = '[Política]';

const ESTADO_META: Record<PedidoEstado, { tone: string; icon: React.ElementType }> = {
  pendente: { tone: 'border-line bg-bg-alt text-ink-soft', icon: Hourglass },
  em_analise: { tone: 'border-warn/40 bg-warn/10 text-warn', icon: Clock },
  concluido: { tone: 'border-risk-low/40 bg-risk-low/10 text-risk-low', icon: CheckCircle2 },
  cancelado: { tone: 'border-line bg-bg-alt text-ink-mute', icon: XCircle },
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Políticas — dois sentidos:
 * 1. O cliente envia políticas da sua organização para análise pela equipa CCA
 *    (entra no ciclo fechado dos Pedidos à CCA, com notificação imediata).
 * 2. Consulta as políticas aprovadas publicadas pela CCA.
 */
export default function PortalPoliticas() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const orgId = currentOrganization?.id;
  const [viewing, setViewing] = useState<PortalPolitica | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { pedidos, createPedido } = usePedidos(orgId);
  // origem é a fonte de verdade; o prefixo no título cobre registos antigos.
  const submissions = pedidos.filter(
    (p) => p.origem === 'politica' || p.titulo.startsWith(POLICY_REQUEST_PREFIX),
  );

  // ── Formulário de submissão ────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [notas, setNotas] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitulo('');
    setNotas('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFileSelect = (f: File | null) => {
    if (!f) return setFile(null);
    const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast({ title: t('portal.policies.fileInvalidType'), variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return setFile(null);
    }
    if (f.size > MAX_FILE_BYTES) {
      toast({ title: t('portal.policies.fileTooLarge'), variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return setFile(null);
    }
    setFile(f);
  };

  const submit = async () => {
    if (!orgId || !titulo.trim()) return;
    if (!file) {
      toast({ title: t('portal.policies.fileRequired'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const path = `submissoes/${orgId}/${crypto.randomUUID()}_${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('politicas')
        .upload(path, file, { upsert: false });
      if (uploadError) {
        throw new Error(`${t('portal.policies.uploadError')}: ${uploadError.message}`);
      }

      await createPedido.mutateAsync({
        titulo: `${POLICY_REQUEST_PREFIX} ${titulo.trim()}`,
        descricao: notas.trim() || null,
        tipo_analise: 'conformidade',
        prioridade: 'normal',
        origem: 'politica',
        anexo_path: path,
        silent: true,
      });

      toast({
        title: t('portal.policies.submitted'),
        description: t('portal.policies.submittedDesc'),
      });
      reset();
      setOpen(false);
    } catch (e) {
      toast({
        title: t('portal.policies.uploadError'),
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Políticas publicadas pela CCA (leitura) ────────────────────────────
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

  const steps = [
    { title: t('portal.policies.step1Title'), desc: t('portal.policies.step1Desc'), icon: Upload },
    { title: t('portal.policies.step2Title'), desc: t('portal.policies.step2Desc'), icon: Send },
    {
      title: t('portal.policies.step3Title'),
      desc: t('portal.policies.step3Desc'),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Eyebrow>{t('portal.pages.policies.eyebrow')}</Eyebrow>
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
            {t('portal.pages.policies.title')}
          </h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
            {t('portal.pages.policies.description')}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0 gap-2">
          <Send className="h-4 w-4" />
          {t('portal.policies.submitCta')}
        </Button>
      </header>

      {/* Como funciona — confiança no processo */}
      <section className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10">
                <s.icon className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
                {i + 1}
              </span>
            </div>
            <p className="mt-2.5 font-display text-[13.5px] font-medium leading-snug text-ink">
              {s.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{s.desc}</p>
          </div>
        ))}
      </section>

      {/* Análises em curso */}
      {submissions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-medium text-ink">
                {t('portal.policies.mySubmissions')}
              </h2>
              <p className="text-[12.5px] text-ink-mute">{t('portal.policies.submissionsHint')}</p>
            </div>
            <Link
              to="/portal/pedidos"
              className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-brand transition-colors hover:text-brand/80"
            >
              {t('portal.policies.viewInRequests')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {submissions.map((p) => {
              const estado = (p.estado as PedidoEstado) ?? 'pendente';
              const meta = ESTADO_META[estado] ?? ESTADO_META.pendente;
              const Icon = meta.icon;
              return (
                <article key={p.id} className="rounded-card border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-[15px] font-medium leading-snug text-ink">
                        {p.titulo.replace(POLICY_REQUEST_PREFIX, '').trim()}
                      </h3>
                      <p className="mt-0.5 text-[11.5px] text-ink-mute">
                        {formatDate(p.created_at, i18n.language)}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 gap-1 text-xs', meta.tone)}>
                      <Icon className="h-3 w-3" strokeWidth={2} />
                      {t(`portal.requests.estados.${estado}`)}
                    </Badge>
                  </div>
                  {p.resposta && (
                    <div className="mt-3 rounded-control border border-brand/30 bg-brand/[0.05] px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
                        {t('portal.requests.response')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                        {p.resposta}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Políticas publicadas pela CCA */}
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-medium text-ink">
          {t('portal.policies.published')}
        </h2>
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
                    <h3 className="font-display text-[15px] font-medium leading-snug text-ink">
                      {p.titulo}
                    </h3>
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
      </section>

      {/* Dialog: ler política publicada */}
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

      {/* Dialog: enviar política para análise */}
      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('portal.policies.submitCta')}</DialogTitle>
            <DialogDescription>{t('portal.policies.submitHint')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="politica-titulo">{t('portal.policies.fields.title')}</Label>
              <Input
                id="politica-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={t('portal.policies.fields.titlePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="politica-file">{t('portal.policies.fields.file')}</Label>
              <Input
                id="politica-file"
                type="file"
                ref={fileInputRef}
                accept=".pdf,.docx,.txt"
                onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11.5px] text-ink-mute">{t('portal.policies.fileHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="politica-notas">{t('portal.policies.fields.notes')}</Label>
              <Textarea
                id="politica-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder={t('portal.policies.fields.notesPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={submit} disabled={!titulo.trim() || !file || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('portal.policies.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
