import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PortalAssistente() {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganizations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

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
    <div className="mx-auto flex h-[calc(100vh-148px)] max-w-3xl flex-col">
      <header className="space-y-2 pb-4">
        <Eyebrow>{t('portal.assistant.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.assistant.title')}
        </h1>
      </header>

      {/* Conversa */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && !isLoading && (
          <div className="rounded-card border border-line bg-surface p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand/[0.08] text-brand">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">
                  {t('portal.assistant.introTitle')}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
                  {t('portal.assistant.introBody')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-control border border-line bg-bg-alt px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:border-brand hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-card px-4 py-3 text-[13.5px] leading-relaxed',
                m.role === 'user'
                  ? 'bg-brand text-white'
                  : 'border border-line bg-surface text-ink',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-[13px] text-ink-mute">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('portal.assistant.thinking')}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder={t('portal.assistant.placeholder')}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-control border border-line bg-surface px-4 py-3 text-[13.5px] text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-control bg-brand text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
          aria-label={t('portal.assistant.send')}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-ink-mute">
        {t('portal.assistant.disclaimer')}
      </p>
    </div>
  );
}
