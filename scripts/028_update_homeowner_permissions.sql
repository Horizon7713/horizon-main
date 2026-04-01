-- Update homeowner permissions to allow access to messages
-- Homeowners can now access both dashboard and messages

UPDATE public.roles
SET permissions = jsonb_build_object(
  'dashboard', true,
  'messages', true,
  'project_management', false
)
WHERE name = 'homeowner';

-- Add comment explaining the change
COMMENT ON TABLE roles IS 'Role definitions with permissions. Homeowners can access dashboard (to view their project) and messages (to communicate about their project).';
