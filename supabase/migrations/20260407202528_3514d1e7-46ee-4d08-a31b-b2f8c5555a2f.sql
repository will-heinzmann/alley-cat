
-- Admin check function
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = '094958ab-cf6a-4ab2-a771-ff8697b4e65f'::uuid;
$$;

-- Create update requests table
CREATE TABLE public.alley_update_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alley_id UUID NOT NULL REFERENCES public.alleys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alley_update_requests ENABLE ROW LEVEL SECURITY;

-- Everyone can view requests
CREATE POLICY "Update requests are viewable by everyone"
ON public.alley_update_requests FOR SELECT
USING (true);

-- Users can submit their own requests
CREATE POLICY "Users can submit update requests"
ON public.alley_update_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admin can update request status
CREATE POLICY "Admin can review update requests"
ON public.alley_update_requests FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Only admin can delete requests
CREATE POLICY "Admin can delete update requests"
ON public.alley_update_requests FOR DELETE
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Fix the overly permissive alleys UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update alleys" ON public.alleys;

CREATE POLICY "Only admin can update alleys"
ON public.alleys FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_alley_update_requests_updated_at
BEFORE UPDATE ON public.alley_update_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
