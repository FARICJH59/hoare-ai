'use client';

import { useState, useRef, useCallback } from 'react';
import { ChatSidebar }    from '@/components/chat/chat-sidebar';
import { ChatMessages }   from '@/components/chat/chat-messages';
import { ChatInput }      from '@/components/chat/chat-input';
import { ChatHeader }     from '@/components/chat/chat-header';
import { generateId }     from '@/lib/utils';

export type Mode = 'chat' | 'generate';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function ChatPage() {
  const [sessions, setSessions]           = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [mode, setMode]                   = useState<Mode>('chat');
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  const createSession = useCallback((): string => {
    const id: string = generateId('session');
    const session: ChatSession = {
      id,
      title:     'New conversation',
      messages:  [],
      createdAt: new Date(),
    };
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(id);
    return id;
  }, []);

  const updateSession = useCallback((sessionId: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? updater(s) : s));
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    let sid = activeSessionId;
    if (!sid) sid = createSession();

    const userMsg: Message = {
      id:        generateId('msg'),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    };

    const assistantMsgId = generateId('msg');
    const assistantMsg: Message = {
      id:          assistantMsgId,
      role:        'assistant',
      content:     '',
      timestamp:   new Date(),
      isStreaming: true,
    };

    updateSession(sid, s => ({
      ...s,
      title:    s.messages.length === 0 ? text.slice(0, 55) : s.title,
      messages: [...s.messages, userMsg, assistantMsg],
    }));

    setIsLoading(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, sessionId: sid, mode }),
        signal:  abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        updateSession(sid!, s => ({
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantMsgId ? { ...m, content: accumulated } : m,
          ),
        }));
      }

      updateSession(sid!, s => ({
        ...s,
        messages: s.messages.map(m =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
        ),
      }));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateSession(sid!, s => ({
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: '⚠️ Something went wrong. Please try again.', isStreaming: false }
              : m,
          ),
        }));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeSessionId, createSession, isLoading, mode, updateSession]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    if (activeSessionId) {
      updateSession(activeSessionId, s => ({
        ...s,
        messages: s.messages.map(m =>
          m.isStreaming ? { ...m, isStreaming: false } : m,
        ),
      }));
    }
  }, [activeSessionId, updateSession]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        open={sidebarOpen}
        onSelectSession={setActiveSessionId}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          mode={mode}
          onModeChange={setMode}
          session={activeSession}
        />

        <div className="flex-1 overflow-hidden">
          <ChatMessages
            messages={activeSession?.messages ?? []}
            isLoading={isLoading}
          />
        </div>

        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isLoading={isLoading}
          mode={mode}
          disabled={false}
        />
      </div>
    </div>
  );
}
