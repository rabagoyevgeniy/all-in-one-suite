
-- Allow students to see open challenges (pending duels with no opponent set)
CREATE POLICY "Students see open challenges"
ON public.duels
FOR SELECT
TO authenticated
USING (status = 'pending' AND opponent_id IS NULL);

-- Allow students to update duels to accept them (set opponent_id + status)
CREATE POLICY "Students accept open duels"
ON public.duels
FOR UPDATE
TO authenticated
USING (status = 'pending' AND opponent_id IS NULL)
WITH CHECK (opponent_id = auth.uid() AND status = 'accepted');

-- Allow students to create duels
CREATE POLICY "Students create duels"
ON public.duels
FOR INSERT
TO authenticated
WITH CHECK (challenger_id = auth.uid());

-- Allow students to insert escrow records for their own duels
CREATE POLICY "Students insert own escrow"
ON public.duel_escrow
FOR INSERT
TO authenticated
WITH CHECK (holder_id = auth.uid());

-- Allow students to view own escrow
CREATE POLICY "Students view own escrow"
ON public.duel_escrow
FOR SELECT
TO authenticated
USING (holder_id = auth.uid());
