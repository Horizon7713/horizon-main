-- Fix RLS policies for receipts table to work with users table structure
-- The issue: auth.uid() returns the Supabase Auth ID, but uploaded_by references users.id
-- Solution: Check if the user's auth_id matches auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON receipts;

-- Policy: Users can insert their own receipts
-- Check if the uploaded_by user has an auth_id matching the current user
CREATE POLICY "Users can insert their own receipts"
  ON receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
  ON receipts
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
  ON receipts
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );
