-- Add unique constraint on (document_id, page_number) for upsert support
ALTER TABLE page_scales
  ADD CONSTRAINT page_scales_document_page_unique
  UNIQUE (document_id, page_number);
