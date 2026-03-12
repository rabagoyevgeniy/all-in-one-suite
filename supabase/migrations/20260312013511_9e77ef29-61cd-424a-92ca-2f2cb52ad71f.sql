
-- Coach can update their own bookings (status changes)
CREATE POLICY "Coach updates own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Authenticated users can insert notifications for any user (system notifications)
CREATE POLICY "Authenticated inserts notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Coach can update students they teach (belt advancement, streak)
CREATE POLICY "Coach updates own students"
ON public.students
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.coach_id = auth.uid() AND b.student_id = students.id
));

-- Coach can insert coin_transactions
CREATE POLICY "Coach inserts coin txns"
ON public.coin_transactions
FOR INSERT
TO authenticated
WITH CHECK (true);
