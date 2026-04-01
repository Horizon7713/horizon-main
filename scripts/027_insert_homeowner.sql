-- Insert homeowner record
-- Links homeowner user to their contractor

-- Updated column name from homeowner_id to homeowner_user_id to match actual table schema
INSERT INTO homeowners (
  homeowner_user_id,
  contractor_id
) VALUES (
  '220a8d95-b07b-4ba5-bb90-452c7856a7d5',
  '3a5c8226-898d-400b-a6b0-7418b38b6e1e'
)
ON CONFLICT (homeowner_user_id) DO UPDATE SET
  contractor_id = EXCLUDED.contractor_id,
  updated_at = NOW();
