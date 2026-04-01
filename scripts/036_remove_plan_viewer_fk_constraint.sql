-- Drop the foreign key constraint on plan_viewer.document_id
-- This allows plan_viewer to store documents independently without requiring
-- a corresponding entry in pdf_files table, which has strict RLS requirements

ALTER TABLE plan_viewer 
DROP CONSTRAINT IF EXISTS plan_viewer_document_id_fkey;

-- Verify the constraint is removed
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'plan_viewer' AND constraint_type = 'FOREIGN KEY';
