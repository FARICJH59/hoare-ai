'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button }   from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn }       from '@/lib/utils';
import { Send, Square, Zap, MessageSquare } from 'lucide-react';
import type { Mode } from '@/app/chat/page';

interface ChatInputProps {
  onSend:    (message: string) => void;
  onStop:    () => void;
  isLoading: boolean;
  mode:      Mode;
  disabled:  boolean;
}

export function ChatInput({ onSend, onStop, isLoading, mode, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for example prompt events from ChatMessages
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      setValue(prompt);
      textareaRef.current?.focus();
    };
    window.addEventListener('hoare:example-prompt', handler);
    return () => window.removeEventListener('hoare:example-prompt', handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          'flex flex-col gap-2 rounded-2xl border border-border bg-card shadow-sm transition-all',
          'focus-within:border-primary/50 focus-within:shadow-md focus-within:shadow-primary/10',
        )}>
          {/* Mode indicator */}
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className={cn(
              'flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 font-medium',
              mode === 'generate'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-muted text-muted-foreground',
            )}>
              {mode === 'generate' ? <Zap className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
              {mode === 'generate' ? 'Generate Mode' : 'Chat Mode'}
            </div>
            <span className="text-xs text-muted-foreground">
              {mode === 'generate' ? 'Full project generation with architecture & CI/CD' : 'Conversational AI with intent analysis'}
            </span>
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2 px-3 pb-3">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'generate'
                  ? 'Describe the platform you want to build…'
                  : 'Ask HOARE.ai anything…'
              }
              disabled={disabled}
              className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60 py-2.5"
              rows={1}
            />
            <div className="flex gap-1.5 pb-0.5">
              {isLoading ? (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={onStop}
                >
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={submit}
                  disabled={!value.trim() || disabled}
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          HOARE.ai can make mistakes. Verify critical outputs. Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Shift+Enter</kbd> for new line.
        </p>
      </div>
    </div>
  );
}
