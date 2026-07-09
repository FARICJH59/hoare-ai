'use client';

import { Button }   from '@/components/ui/button';
import { cn }       from '@/lib/utils';
import type { ChatSession, Mode } from '@/app/chat/page';
import { PanelLeft, Sun, Moon, Zap, MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ChatHeaderProps {
  sidebarOpen:     boolean;
  onToggleSidebar: () => void;
  mode:            Mode;
  onModeChange:    (m: Mode) => void;
  session:         ChatSession | null;
}

export function ChatHeader({ sidebarOpen, onToggleSidebar, mode, onModeChange, session }: ChatHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSidebar}>
            <PanelLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {session?.title || 'HOARE.ai'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          <button
            onClick={() => onModeChange('chat')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              mode === 'chat'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            onClick={() => onModeChange('generate')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              mode === 'generate'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Generate
          </button>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </Button>
      </div>
    </header>
  );
}
