

# Plan: Add Emoji Reactions to Chat Messages

## Overview
Add a long-press/right-click context menu on message bubbles with quick emoji reactions, reply, edit, and delete options. Reactions are stored in a new `chat_reactions` table and displayed below messages.

## Step 1: Database Migration — `chat_reactions` table

Create table with unique constraint on `(message_id, user_id, emoji)`:

```sql
CREATE TABLE public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: room members can see reactions
CREATE POLICY "reactions_select" ON public.chat_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE cm.id = chat_reactions.message_id
    AND (is_chat_member(auth.uid(), cm.room_id) OR is_public_chat_room(cm.room_id))
  ));

-- INSERT: authenticated users who are members
CREATE POLICY "reactions_insert" ON public.chat_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: own reactions only
CREATE POLICY "reactions_delete" ON public.chat_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
```

## Step 2: New Component — `MessageContextMenu.tsx`

A component wrapping each message bubble that triggers on:
- **Mobile**: long-press (500ms touch hold via `onTouchStart`/`onTouchEnd`)
- **Desktop**: right-click (`onContextMenu`)

Shows a popover/dropdown with:
- **Quick reactions bar**: 👍 ❤️ 😂 😮 😢 🔥 (6 buttons in a row)
- **Actions list**:
  - For own messages: Reply, Edit (if < 5 min old), Delete
  - For others' messages: Reply

Uses shadcn `DropdownMenu` positioned near the tap point.

## Step 3: New Component — `MessageReactions.tsx`

Displayed below each message bubble. Groups reactions by emoji, shows count. Clicking own reaction removes it.

```text
┌──────────────────────┐
│  Message body...     │
│              12:34   │
└──────────────────────┘
 👍 2  ❤️ 1
```

## Step 4: Update `ChatRoom.tsx`

- Fetch reactions alongside messages (query `chat_reactions` for all message IDs in the room)
- Subscribe to realtime changes on `chat_reactions` for the room
- Wrap each message bubble with `MessageContextMenu`
- Render `MessageReactions` below each bubble
- Reply/Edit/Delete actions will be wired as state setters (reply UI and edit/delete will be placeholder handlers for now — full implementation in a follow-up)

## Files Changed
| File | Action |
|------|--------|
| Migration SQL | Create `chat_reactions` table + RLS + realtime |
| `src/components/chat/MessageContextMenu.tsx` | New — long-press menu with quick reactions |
| `src/components/chat/MessageReactions.tsx` | New — reaction badges below messages |
| `src/pages/chat/ChatRoom.tsx` | Updated — integrate context menu, reactions query, realtime |

## Complexity
- Database: Low
- Context menu + long-press: Medium
- Reactions display + toggle: Medium
- Overall: **Medium**

