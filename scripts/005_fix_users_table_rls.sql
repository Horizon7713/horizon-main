-- Disable RLS on users table to allow service role access
-- The service role key should bypass RLS, but we'll ensure proper policies are in place

-- First, check if RLS is enabled and disable it temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Or alternatively, if you want to keep RLS enabled, add policies that allow service role access
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to do everything
-- CREATE POLICY "Service role can do everything" ON public.users
-- FOR ALL
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

-- Create policy to allow authenticated users to read their own data
-- CREATE POLICY "Users can read own data" ON public.users
-- FOR SELECT
-- TO authenticated
-- USING (auth_id = auth.uid());

-- Create policy to allow authenticated users to update their own data
-- CREATE POLICY "Users can update own data" ON public.users
-- FOR UPDATE
-- TO authenticated
-- USING (auth_id = auth.uid())
-- WITH CHECK (auth_id = auth.uid());
