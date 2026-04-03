
DROP POLICY "Authenticated users can create alleys" ON public.alleys;
CREATE POLICY "Authenticated users can create alleys" ON public.alleys FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
