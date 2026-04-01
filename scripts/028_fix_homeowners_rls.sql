-- Drop existing restrictive SELECT policies on homeowners table
DROP POLICY IF EXISTS "Homeowners can view their own profile" ON public.homeowners;
DROP POLICY IF EXISTS "Contractors can view their homeowners" ON public.homeowners;

-- Create a more permissive SELECT policy that allows authenticated users to read homeowners data
-- This is needed because the application uses the public.users table IDs, not auth.uid()
CREATE POLICY "Authenticated users can view homeowners"
  ON public.homeowners
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the restrictive policies for INSERT, UPDATE, DELETE
-- (existing policies remain unchanged)
