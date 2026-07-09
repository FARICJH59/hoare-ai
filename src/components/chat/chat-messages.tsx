'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea }        from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge }             from '@/components/ui/badge';
import { cn }                from '@/lib/utils';
import type { Message }      from '@/app/chat/page';
import ReactMarkdown         from 'react-markdown';
import remarkGfm             from 'remark-gfm';
import { Sparkles, User }    from 'lucide-react';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/20">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">HOARE.ai</h2>
          <p className="text-muted-foreground">
            Enterprise AI assistant powered by autonomous agents. Ask me to build platforms, design
            architectures, or generate full-stack applications.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
          {EXAMPLE_PROMPTS.map(p => (
            <ExamplePrompt key={p.title} {...p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn('text-xs', isUser ? 'bg-primary text-primary-foreground' : 'bg-blue-600 text-white')}>
          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser && 'items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted border border-border rounded-tl-sm',
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-blue-600 text-white text-xs">
          <Sparkles className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExamplePrompt({ title, prompt }: { title: string; prompt: string }) {
  return (
    <button
      className="text-left p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 transition-all text-sm group"
      onClick={() => {
        // Dispatch custom event that ChatInput listens to
        window.dispatchEvent(new CustomEvent('hoare:example-prompt', { detail: prompt }));
      }}
    >
      <p className="font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{prompt}</p>
    </button>
  );
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Healthcare AI Platform',
    prompt: 'Build me a healthcare AI platform with patient management, EHR integration, and telemedicine features',
  },
  {
    title: 'FinTech Payment System',
    prompt: 'Create a multi-tenant payment processing platform with Stripe, KYC verification, and real-time fraud detection',
  },
  {
    title: 'Enterprise SaaS',
    prompt: 'Design an enterprise SaaS with multi-tenancy, RBAC, billing, and analytics dashboard',
  },
  {
    title: 'AI/ML Platform',
    prompt: 'Build an LLM inference platform with RAG, vector search, embeddings API, and model fine-tuning pipeline',
  },
];
