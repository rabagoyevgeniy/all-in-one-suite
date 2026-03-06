
-- Create a security definer function to check chat membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Create a function to check if room is community/announcement
CREATE OR REPLACE FUNCTION public.is_public_chat_room(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = _room_id AND type IN ('community', 'announcement')
  )
$$;

-- Drop old problematic policies
DROP POLICY IF EXISTS "Members see room members" ON public.chat_members;
DROP POLICY IF EXISTS "Members see room messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users see rooms they belong to" ON public.chat_rooms;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Members see room members" ON public.chat_members
  FOR SELECT TO authenticated
  USING (
    is_chat_member(auth.uid(), room_id)
    OR is_public_chat_room(room_id)
  );

CREATE POLICY "Members see room messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    is_chat_member(auth.uid(), room_id)
    OR is_public_chat_room(room_id)
  );

CREATE POLICY "Members send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      is_chat_member(auth.uid(), room_id)
      OR (EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND type = 'community'))
    )
  );

CREATE POLICY "Users see rooms they belong to" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (
    is_chat_member(auth.uid(), id)
    OR type IN ('community', 'announcement')
  );

-- Also add a policy to allow updating chat_rooms (for last_message)
DROP POLICY IF EXISTS "Members update room last message" ON public.chat_rooms;
CREATE POLICY "Members update room last message" ON public.chat_rooms
  FOR UPDATE TO authenticated
  USING (is_chat_member(auth.uid(), id))
  WITH CHECK (is_chat_member(auth.uid(), id));
