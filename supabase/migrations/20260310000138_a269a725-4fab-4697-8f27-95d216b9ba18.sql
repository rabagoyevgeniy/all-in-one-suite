
-- Function to auto-create chat room on booking confirmation
CREATE OR REPLACE FUNCTION public.create_chat_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_id UUID;
  v_existing_room_id UUID;
BEGIN
  -- Only trigger on confirmed bookings with both parent and coach
  IF NEW.status IN ('confirmed', 'in_progress', 'completed')
     AND NEW.parent_id IS NOT NULL
     AND NEW.coach_id IS NOT NULL
  THEN
    -- Check if direct chat room already exists between parent and coach
    SELECT cm1.room_id INTO v_existing_room_id
    FROM chat_members cm1
    JOIN chat_members cm2 ON cm1.room_id = cm2.room_id
    JOIN chat_rooms cr ON cr.id = cm1.room_id
    WHERE cm1.user_id = NEW.parent_id
      AND cm2.user_id = NEW.coach_id
      AND cr.type = 'direct'
    LIMIT 1;

    -- Only create if doesn't exist
    IF v_existing_room_id IS NULL THEN
      INSERT INTO chat_rooms (type, created_by, status)
      VALUES ('direct', NEW.parent_id, 'active')
      RETURNING id INTO v_room_id;

      INSERT INTO chat_members (room_id, user_id, role)
      VALUES (v_room_id, NEW.parent_id, 'member');

      INSERT INTO chat_members (room_id, user_id, role)
      VALUES (v_room_id, NEW.coach_id, 'member');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS booking_creates_chat_room ON bookings;
CREATE TRIGGER booking_creates_chat_room
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_on_booking();

-- Backfill: create chat rooms for ALL existing confirmed/completed bookings
DO $$
DECLARE
  b RECORD;
  v_room_id UUID;
  v_existing_room_id UUID;
BEGIN
  FOR b IN
    SELECT DISTINCT parent_id, coach_id
    FROM bookings
    WHERE status IN ('confirmed', 'completed', 'in_progress')
      AND parent_id IS NOT NULL
      AND coach_id IS NOT NULL
  LOOP
    SELECT cm1.room_id INTO v_existing_room_id
    FROM chat_members cm1
    JOIN chat_members cm2 ON cm1.room_id = cm2.room_id
    JOIN chat_rooms cr ON cr.id = cm1.room_id
    WHERE cm1.user_id = b.parent_id
      AND cm2.user_id = b.coach_id
      AND cr.type = 'direct'
    LIMIT 1;

    IF v_existing_room_id IS NULL THEN
      INSERT INTO chat_rooms (type, created_by, status)
      VALUES ('direct', b.parent_id, 'active')
      RETURNING id INTO v_room_id;

      INSERT INTO chat_members (room_id, user_id, role)
      VALUES (v_room_id, b.parent_id, 'member');

      INSERT INTO chat_members (room_id, user_id, role)
      VALUES (v_room_id, b.coach_id, 'member');
    END IF;
  END LOOP;
END $$;
