ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS request_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Update RLS: Only show active rooms to non-admins in community listing
DROP POLICY IF EXISTS "rooms_select" ON public.chat_rooms;
CREATE POLICY "rooms_select" ON public.chat_rooms
  FOR SELECT USING (
    (type IN ('community', 'announcement') AND status = 'active')
    OR is_chat_member(auth.uid(), id)
    OR has_role(auth.uid(), 'admin')
  );

-- Allow authenticated users to insert pending community requests
DROP POLICY IF EXISTS "rooms_insert" ON public.chat_rooms;
CREATE POLICY "rooms_insert" ON public.chat_rooms
  FOR INSERT WITH CHECK (true);