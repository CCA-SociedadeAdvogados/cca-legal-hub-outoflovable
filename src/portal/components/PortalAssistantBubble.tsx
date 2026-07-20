import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useHubPortalConfig } from '@/hooks/useHub';
import { toast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Assistente do Portal do Cliente — bolha flutuante (S3 do blueprint).
 *
 * Botão circular com estrela, fixo sobre todas as páginas do portal; abre um
 * painel de conversa. O assistente responde APENAS sobre o universo que o
 * cliente contratou à CCA (contratos, assuntos publicados e documentos) — o
 * âmbito é imposto no servidor (edge function portal-assistant): perguntas
 * fora do universo contratado recebem o redirecionamento "não contratou a CCA
 * para este serviço — contacte-nos".
 *
 * Visibilidade controlada na consola de gestão (funcionalidades.assistente),
 * com o mesmo gate aplicado do lado do servidor.
 */
export function PortalAssistantBubble() {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const { data: config } = useHubPortalConfig(currentOrganization?.id);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const indexTriggered = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, open]);

  // Aquece o índice de documentos em segundo plano (incremental/idempotente)
  // na primeira abertura, para o assistente poder citar o conteúdo.
  useEffect(() => {
    const orgId = currentOrganization?.id;
    if (!open || !orgId || indexTriggered.current === orgId) return;
    indexTriggered.current = orgId;
    supabase.functions
      .invoke('index-client-documents', { body: { organization_id: orgId } })
      .catch(() => {
        /* fire-and-forget: a indexação corre em segundo plano */
      });
  }, [open, currentOrganization?.id]);

  if (config?.funcionalidades.assistente === false) return null;

  const suggestions = t('portal.assistant.suggestions', { returnObjects: true }) as string[];

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;
    if (!currentOrganization?.id) {
      toast({ title: t('portal.assistant.error'), variant: 'destructive' });
      return;
    }

    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('portal-assistant', {
        body: { organization_id: currentOrganization.id, messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: 'assistant', content: data.response as string }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: t('portal.assistant.errorReply') }]);
      toast({
        title: t('portal.assistant.error'),
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Painel de conversa */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex h-[min(560px,calc(100vh-140px))] w-[min(400px,calc(100vw-3rem))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-2xl"
          role="dialog"
          aria-label={t('portal.assistant.title')}
        >
          <header className="flex items-center justify-between border-b border-line bg-bg-alt px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/[0.12] text-brand">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[13px] font-medium leading-tight text-ink">
                  {t('portal.assistant.title')}
                </p>
                <p className="text-[10.5px] text-ink-mute">{t('portal.assistant.eyebrow')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-ink-mute transition-colors hover:bg-bg-alt hover:text-ink"
              aria-label={t('common.close', 'Fechar')}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !isLoading && (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-ink">
                  {t('portal.assistant.introTitle')}
                </p>
                <p className="text-[12.5px] leading-relaxed text-ink-mute">
                  {t('portal.assistant.introBody')}
                </p>
                <div className="space-y-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="block w-full rounded-control border border-line bg-bg-alt px-3 py-2 text-left text-[12px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-card px-3 py-2 text-[12.5px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-brand text-white'
                      : 'border border-line bg-bg-alt text-ink-soft',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-[12px] text-ink-mute">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('portal.assistant.thinking')}
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('portal.assistant.placeholder')}
                className="h-9 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-brand/50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand text-white transition-opacity disabled:opacity-40"
                aria-label={t('portal.assistant.send')}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-[10px] leading-snug text-ink-mute">
              {t('portal.assistant.disclaimer')}
            </p>
          </div>
        </div>
      )}

      {/* Bolha flutuante com estrela */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('portal.assistant.title')}
        aria-expanded={open}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          'bg-brand text-white hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          open && 'scale-95',
        )}
      >
        <Sparkles className="h-6 w-6" strokeWidth={1.75} />
      </button>
    </>
  );
}
