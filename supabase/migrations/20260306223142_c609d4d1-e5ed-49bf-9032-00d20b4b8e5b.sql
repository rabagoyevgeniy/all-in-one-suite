
-- Add pinned message columns to chat_rooms
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_message_text text;

-- Add forwarding columns to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS forwarded_from_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_from_name text;
