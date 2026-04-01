-- ============================================================
-- Event Sourcing: document_events + document_snapshots
-- Append-only event log + periodic snapshots for plan viewer
-- ============================================================

-- 1. Event type enum
DO $$ BEGIN
  CREATE TYPE document_event_type AS ENUM (
    'MARKUP_CREATED',
    'MARKUP_UPDATED',
    'MARKUP_DELETED',
    'SCALE_SET',
    'COMMENT_ADDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Append-only event log
CREATE TABLE IF NOT EXISTS document_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  event_type  document_event_type NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  -- optional FK to the specific markup affected
  markup_id   uuid REFERENCES pdf_markups(id) ON DELETE SET NULL,
  page_number integer,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- monotonic ordering within a document
  seq         bigint GENERATED ALWAYS AS IDENTITY
);

-- Indexes for fast replay and filtering
CREATE INDEX IF NOT EXISTS idx_doc_events_doc_seq
  ON document_events (document_id, seq);
CREATE INDEX IF NOT EXISTS idx_doc_events_doc_type
  ON document_events (document_id, event_type);
CREATE INDEX IF NOT EXISTS idx_doc_events_markup
  ON document_events (markup_id) WHERE markup_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_events_user
  ON document_events (user_id);

-- 3. Periodic snapshots (materialized state at a point in time)
CREATE TABLE IF NOT EXISTS document_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  -- seq of the last event included in this snapshot
  last_seq    bigint NOT NULL,
  -- full materialized state
  markups     jsonb NOT NULL DEFAULT '[]',
  page_scales jsonb NOT NULL DEFAULT '[]',
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_snapshots_doc_seq
  ON document_snapshots (document_id, last_seq DESC);

-- 4. RLS policies
ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_snapshots ENABLE ROW LEVEL SECURITY;

-- Events: anyone authenticated can read; only author can insert
CREATE POLICY "events_select" ON document_events
  FOR SELECT USING (true);
CREATE POLICY "events_insert" ON document_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Snapshots: anyone authenticated can read; author can insert
CREATE POLICY "snapshots_select" ON document_snapshots
  FOR SELECT USING (true);
CREATE POLICY "snapshots_insert" ON document_snapshots
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- Example: Insert a MARKUP_CREATED event
-- ============================================================
-- INSERT INTO document_events (document_id, event_type, markup_id, page_number, user_id, payload)
-- VALUES (
--   '11111111-1111-1111-1111-111111111111',  -- pdf_files.id
--   'MARKUP_CREATED',
--   '22222222-2222-2222-2222-222222222222',  -- pdf_markups.id
--   1,
--   auth.uid(),
--   '{
--     "type": "distance",
--     "startPoint": {"x": 100, "y": 200},
--     "endPoint": {"x": 400, "y": 200},
--     "pixelDistance": 300,
--     "style": {"strokeColor": "#2563EB", "strokeWidth": 2}
--   }'
-- );

-- ============================================================
-- Example: Insert a snapshot after applying N events
-- ============================================================
-- INSERT INTO document_snapshots (document_id, last_seq, markups, page_scales, metadata, created_by)
-- VALUES (
--   '11111111-1111-1111-1111-111111111111',
--   42,  -- seq of last event included
--   '[{"id":"22222222-...","type":"distance","pageNumber":1,"startPoint":{"x":100,"y":200},"endPoint":{"x":400,"y":200},"pixelDistance":300}]',
--   '[{"pageNumber":1,"inchesPerPixel":0.6667,"label":"1/4\" = 1''-0\""}]',
--   '{"snapshotReason": "periodic", "markupCount": 1}',
--   auth.uid()
-- );
