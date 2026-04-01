-- Create homeowners table
CREATE TABLE IF NOT EXISTS public.homeowners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  property_address TEXT,
  phone TEXT,
  email TEXT,
  secondary_contact_name TEXT,
  secondary_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(homeowner_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_homeowners_user_id ON public.homeowners(homeowner_user_id);
CREATE INDEX IF NOT EXISTS idx_homeowners_contractor_id ON public.homeowners(contractor_id);

-- Enable Row Level Security
ALTER TABLE public.homeowners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Homeowners can view their own profile"
  ON public.homeowners
  FOR SELECT
  TO authenticated
  USING (homeowner_user_id = auth.uid());

CREATE POLICY "Contractors can view their homeowners"
  ON public.homeowners
  FOR SELECT
  TO authenticated
  USING (
    contractor_id IN (
      SELECT id FROM public.contractors WHERE contractor_user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can insert their own profile"
  ON public.homeowners
  FOR INSERT
  TO authenticated
  WITH CHECK (homeowner_user_id = auth.uid());

CREATE POLICY "Homeowners can update their own profile"
  ON public.homeowners
  FOR UPDATE
  TO authenticated
  USING (homeowner_user_id = auth.uid())
  WITH CHECK (homeowner_user_id = auth.uid());

CREATE POLICY "Contractors can update their homeowners"
  ON public.homeowners
  FOR UPDATE
  TO authenticated
  USING (
    contractor_id IN (
      SELECT id FROM public.contractors WHERE contractor_user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can delete their own profile"
  ON public.homeowners
  FOR DELETE
  TO authenticated
  USING (homeowner_user_id = auth.uid());
