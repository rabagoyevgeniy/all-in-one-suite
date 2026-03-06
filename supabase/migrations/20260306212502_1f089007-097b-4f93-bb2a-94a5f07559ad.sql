
-- Step 1: Drop ALL existing policies on chat_rooms
DROP POLICY IF EXISTS "member_create_room" ON public.chat_rooms;
DROP POLICY IF EXISTS "admin_manage_rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "member_see_rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admin manages rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Members update room last message" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users create direct/group rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users see rooms they belong to" ON public.chat_rooms;
DROP POLICY IF EXISTS "rooms_select" ON public.chat_rooms;
DROP POLICY IF EXISTS "rooms_insert" ON public.chat_rooms;
DROP POLICY IF EXISTS "rooms_update" ON public.chat_rooms;
DROP POLICY IF EXISTS "rooms_admin" ON public.chat_rooms;

-- Step 2: Remove DEFAULT constraint
ALTER TABLE public.chat_rooms 
  ALTER COLUMN created_by DROP DEFAULT;

-- Step 3: Recreate ALL policies cleanly
CREATE POLICY "rooms_select" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (
    type IN ('community', 'announcement')
    OR is_chat_member(auth.uid(), id)
  );

CREATE POLICY "rooms_insert" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "rooms_update" ON public.chat_rooms
  FOR UPDATE TO authenticated
  USING (is_chat_member(auth.uid(), id));

CREATE POLICY "rooms_admin" ON public.chat_rooms
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Fix chat_members policies
DROP POLICY IF EXISTS "join_leave_rooms" ON public.chat_members;
DROP POLICY IF EXISTS "see_own_memberships" ON public.chat_members;
DROP POLICY IF EXISTS "admin_manage_members" ON public.chat_members;
DROP POLICY IF EXISTS "members_insert" ON public.chat_members;
DROP POLICY IF EXISTS "member_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "Admin manages members" ON public.chat_members;
DROP POLICY IF EXISTS "Members see room members" ON public.chat_members;
DROP POLICY IF EXISTS "Users insert members for own rooms" ON public.chat_members;
DROP POLICY IF EXISTS "Users update own membership" ON public.chat_members;
DROP POLICY IF EXISTS "members_select" ON public.chat_members;
DROP POLICY IF EXISTS "members_update" ON public.chat_members;

CREATE POLICY "members_select" ON public.chat_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_chat_member(auth.uid(), room_id)
    OR is_public_chat_room(room_id)
  );

CREATE POLICY "members_insert" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "members_update" ON public.chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "members_admin" ON public.chat_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
