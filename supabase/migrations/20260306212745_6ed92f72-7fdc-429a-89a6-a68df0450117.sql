
CREATE OR REPLACE FUNCTION public.create_direct_chat(
  other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if direct room already exists between these two users
  SELECT cm1.room_id INTO v_room_id
  FROM chat_members cm1
  JOIN chat_members cm2 ON cm1.room_id = cm2.room_id
  JOIN chat_rooms cr ON cr.id = cm1.room_id
  WHERE cm1.user_id = v_current_user_id
    AND cm2.user_id = other_user_id
    AND cr.type = 'direct'
  LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  INSERT INTO chat_rooms (type, name, created_by)
  VALUES ('direct', 'Direct Chat', v_current_user_id)
  RETURNING id INTO v_room_id;

  INSERT INTO chat_members (room_id, user_id, role)
  VALUES
    (v_room_id, v_current_user_id, 'member'),
    (v_room_id, other_user_id, 'member');

  RETURN v_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_chat(UUID) TO authenticated;
