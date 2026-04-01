-- Insert role rows into the roles table
INSERT INTO roles (name, permissions)
VALUES 
  ('employee', '[]'::jsonb),
  ('contractor', '[]'::jsonb),
  ('subcontractor', '[]'::jsonb),
  ('homeowner', '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE roles IS 'Stores user roles and their associated permissions';
