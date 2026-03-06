
-- Set DEFAULT so created_by auto-fills
ALTER TABLE public.chat_rooms 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Users create direct/group rooms" ON public.chat_rooms;

-- New permissive INSERT policy for any authenticated user
CREATE POLICY "Users create direct/group rooms" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Fix chat_members INSERT — allow room creator to add other members
DROP POLICY IF EXISTS "Users insert members for own rooms" ON public.chat_members;

CREATE POLICY "Users insert members for own rooms" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = chat_members.room_id 
      AND chat_rooms.created_by = auth.uid()
    ))
  );
