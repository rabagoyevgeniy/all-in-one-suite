
-- Chat rooms table
CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  name text,
  city text,
  created_by uuid REFERENCES public.profiles(id),
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Chat members table
CREATE TABLE public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) NOT NULL,
  body text NOT NULL,
  reply_to_id uuid REFERENCES public.chat_messages(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: chat_rooms
CREATE POLICY "Users see rooms they belong to" ON public.chat_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_rooms.id AND user_id = auth.uid())
  OR type IN ('community', 'announcement')
);
CREATE POLICY "Users create direct/group rooms" ON public.chat_rooms FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admin manages rooms" ON public.chat_rooms FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: chat_members
CREATE POLICY "Members see room members" ON public.chat_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = chat_members.room_id AND cm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.chat_rooms cr WHERE cr.id = chat_members.room_id AND cr.type IN ('community', 'announcement'))
);
CREATE POLICY "Users insert members for own rooms" ON public.chat_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid())
);
CREATE POLICY "Users update own membership" ON public.chat_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admin manages members" ON public.chat_members FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: chat_messages
CREATE POLICY "Members see room messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_messages.room_id AND type IN ('community', 'announcement'))
);
CREATE POLICY "Members send messages" ON public.chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_messages.room_id AND type = 'community')
  )
);
CREATE POLICY "Admin manages messages" ON public.chat_messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Seed community rooms
INSERT INTO public.chat_rooms (type, name, city) VALUES
  ('community', 'ProFit Dubai Community', 'Dubai'),
  ('community', 'ProFit Baku Community', 'Baku'),
  ('announcement', 'ProFit Announcements', NULL);
