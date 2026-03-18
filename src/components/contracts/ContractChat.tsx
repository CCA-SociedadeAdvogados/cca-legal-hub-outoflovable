import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useContractChat } from "@/hooks/useContractChat";
import { Bot, Send, User, Loader2, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractChatProps {
  contractId: string;
}

const SUGGESTED_QUESTIONS = [
  "Quais são as minhas principais obrigações?",
  "Qual o prazo de denúncia do contrato?",
  "Existe renovação automática? Em que condições?",
  "Quais as penalizações por incumprimento?",
  "Que dados pessoais são tratados neste contrato?",
];

export function ContractChat({ contractId }: ContractChatProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useContractChat(contractId);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">Assistente IA</span>
          <Badge variant="outline" className="text-xs font-normal">Claude</Badge>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-3 text-sm max-w-sm">
                Olá! Posso responder a perguntas sobre este contrato. Como posso ajudar?
              </div>
            </div>

            {/* Sugestões */}
            <div className="ml-11 space-y-2">
              <p className="text-xs text-muted-foreground">Sugestões:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs rounded-full border px-3 py-1.5 hover:bg-muted transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === "user" && "flex-row-reverse",
                )}
              >
                <div className={cn(
                  "rounded-full p-2 shrink-0",
                  msg.role === "user" ? "bg-primary/10" : "bg-muted",
                )}>
                  {msg.role === "user"
                    ? <User className="h-4 w-4 text-primary" />
                    : <Bot className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div className={cn(
                  "rounded-lg px-4 py-3 text-sm max-w-[75%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.model_used && (
                    <p className="text-xs opacity-50 mt-1 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {msg.model_used.includes("haiku") ? "Haiku" : "Sonnet"}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-muted p-2 shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva a sua pergunta... (Enter para enviar)"
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
