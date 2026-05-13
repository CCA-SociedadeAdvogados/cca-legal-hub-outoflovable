import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  timestamp: Date;
}

export function useContractChat(contractId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const { data, error } = await supabase.functions.invoke('contract-chat', {
          body: {
            contract_id: contractId,
            messages: apiMessages,
          },
        });

        if (error) {
          let msg = error.message;
          try {
            if (error.context && typeof error.context.json === 'function') {
              const body = await error.context.json();
              if (body?.error) msg = body.error;
            }
          } catch {
            /* use original */
          }
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.response,
          model_used: data.model_used,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error: unknown) {
        console.error('[useContractChat] Error:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
        // Remover a mensagem do utilizador em caso de erro
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [contractId, messages, isLoading],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
