CREATE TABLE public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.chat_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE cm.id = chat_reactions.message_id
    AND (is_chat_member(auth.uid(), cm.room_id) OR is_public_chat_room(cm.room_id))
  ));

CREATE POLICY "reactions_insert" ON public.chat_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete" ON public.chat_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;