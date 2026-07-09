'use client';

import { Button }     from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn }         from '@/lib/utils';
import type { ChatSession } from '@/app/chat/page';
import {
  Plus, MessageSquare, Trash2, PanelLeft, Sparkles, ChevronRight,
} from 'lucide-react';

interface ChatSidebarProps {
  sessions:        ChatSession[];
  activeSessionId: string | null;
  open:            boolean;
  onSelectSession: (id: string) => void;
  onNewChat:       () => void;
  onDeleteSession: (id: string) => void;
  onClose:         () => void;
}

export function ChatSidebar({
  sessions, activeSessionId, open, onSelectSession, onNewChat, onDeleteSession, onClose,
}: ChatSidebarProps) {
  if (!open) {
    return (
      <div className="flex flex-col items-center gap-2 w-12 border-r border-border py-3 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewChat}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="flex flex-col w-64 border-r border-border bg-card/50 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm tracking-tight">HOARE.ai</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* New chat button */}
      <div className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9"
          onClick={onNewChat}
        >
          <Plus className="w-4 h-4" />
          New chat
        </Button>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1 px-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            Start a conversation to see your history here.
          </p>
        ) : (
          <div className="space-y-0.5 py-1">
            {sessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">HOARE.ai v1.0.0</p>
      </div>
    </aside>
  );
}

function SessionItem({
  session, isActive, onSelect, onDelete,
}: {
  session:  ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer hover:bg-accent transition-colors',
        isActive && 'bg-accent',
      )}
      onClick={onSelect}
    >
      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-xs truncate text-foreground/80">
        {session.title || 'New conversation'}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
