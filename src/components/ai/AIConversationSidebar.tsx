import { useState } from 'react';
import {
  Plus, Search, X, Pin, Trash2, MessageSquare,
  PanelLeftClose, Sparkles, MoreHorizontal, PenLine,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AIConversationItem, useAIConversations } from '@/hooks/useAIConversation';

interface Props {
  userId: string | undefined;
  activeConversationId: string | null;
  onSelect: (id: string, mode: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

function ConversationGroup({
  label,
  items,
  activeId,
  onSelect,
  onDelete,
  onPin,
  onRename,
}: {
  label: string;
  items: AIConversationItem[];
  activeId: string | null;
  onSelect: (id: string, mode: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
        {label}
      </p>
      {items.map((conv) => (
        <div
          key={conv.id}
          className="relative"
          onMouseEnter={() => setHoveredId(conv.id)}
          onMouseLeave={() => { setHoveredId(null); setMenuId(null); }}
        >
          <button
            onClick={() => onSelect(conv.id, conv.mode)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors group flex items-center gap-2',
              activeId === conv.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted/60'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
            <span className="truncate flex-1">{conv.title}</span>
          </button>

          {/* Context menu trigger */}
          {(hoveredId === conv.id || menuId === conv.id) && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {/* Context menu */}
          <AnimatePresence>
            {menuId === conv.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-2 top-full z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[140px]"
              >
                <button
                  onClick={() => { onRename(conv.id); setMenuId(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <PenLine className="w-3 h-3" /> Rename
                </button>
                <button
                  onClick={() => { onPin(conv.id, !conv.is_pinned); setMenuId(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <Pin className="w-3 h-3" /> {conv.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => { onDelete(conv.id); setMenuId(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function AIConversationSidebar({
  userId,
  activeConversationId,
  onSelect,
  onNewConversation,
  isOpen,
  onClose,
  isMobile,
}: Props) {
  const { grouped, deleteConversation, pinConversation, renameConversation } = useAIConversations(userId);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRename = (id: string) => {
    const conv = [...grouped.pinned, ...grouped.todayItems, ...grouped.yesterdayItems, ...grouped.thisWeekItems, ...grouped.olderItems].find(c => c.id === id);
    if (conv) {
      setRenamingId(id);
      setRenameValue(conv.title);
    }
  };

  const submitRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  // Filter by search
  const filterItems = (items: AIConversationItem[]) =>
    search ? items.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : items;

  const handleSelect = (id: string, mode: string) => {
    onSelect(id, mode);
    if (isMobile) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">ProFit AI</span>
          </div>
          {isMobile && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* New conversation button */}
        <button
          onClick={() => { onNewConversation(); if (isMobile) onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          New conversation
        </button>

        {/* Search */}
        <div className="mt-2 flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Rename modal */}
      <AnimatePresence>
        {renamingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2 border-b border-border bg-muted/30"
          >
            <p className="text-[10px] text-muted-foreground mb-1">Rename conversation</p>
            <div className="flex gap-1.5">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                className="flex-1 text-xs px-2 py-1 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <button onClick={submitRename} className="text-[10px] px-2 py-1 bg-primary text-primary-foreground rounded-lg">
                Save
              </button>
              <button onClick={() => setRenamingId(null)} className="text-[10px] px-2 py-1 text-muted-foreground">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        <ConversationGroup
          label="📌 Pinned"
          items={filterItems(grouped.pinned)}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onRename={handleRename}
        />
        <ConversationGroup
          label="Today"
          items={filterItems(grouped.todayItems)}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onRename={handleRename}
        />
        <ConversationGroup
          label="Yesterday"
          items={filterItems(grouped.yesterdayItems)}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onRename={handleRename}
        />
        <ConversationGroup
          label="This week"
          items={filterItems(grouped.thisWeekItems)}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onRename={handleRename}
        />
        <ConversationGroup
          label="Older"
          items={filterItems(grouped.olderItems)}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onPin={pinConversation}
          onRename={handleRename}
        />

        {grouped.pinned.length === 0 &&
         grouped.todayItems.length === 0 &&
         grouped.yesterdayItems.length === 0 &&
         grouped.thisWeekItems.length === 0 &&
         grouped.olderItems.length === 0 && (
          <div className="text-center py-12 px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: drawer overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop — always in DOM, pointer-events controlled */}
        <div
          className={cn(
            'fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300',
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
        />
        {/* Drawer panel */}
        <aside
          className={cn(
            'fixed left-0 top-0 bottom-0 w-[280px] z-[101] shadow-2xl',
            'bg-background transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: collapsible panel
  if (!isOpen) return null;

  return (
    <div className="w-[260px] flex-shrink-0 h-full">
      {sidebarContent}
    </div>
  );
}
