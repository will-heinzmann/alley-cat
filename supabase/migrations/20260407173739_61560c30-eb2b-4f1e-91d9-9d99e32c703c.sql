CREATE POLICY "Authenticated users can update alleys"
ON public.alleys
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);