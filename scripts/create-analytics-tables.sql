-- ============================================================================
-- Analytics + Workflow tables for AI-assisted document analysis
-- ============================================================================

-- 1. Analysis runs — one row per AI analysis invocation
create table if not exists public.document_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.pdf_files(id) on delete cascade,
  run_type text not null default 'full',            -- full | incremental | conflict_check
  status text not null default 'pending',           -- pending | running | completed | failed
  summary text,                                     -- AI-generated plain-text summary
  stats jsonb not null default '{}',                -- { markupCount, eventCount, conflictCount, ... }
  heatmap_data jsonb,                               -- per-page array of { x, y, intensity } for rendering
  model text,                                       -- which AI model was used
  token_usage jsonb,                                -- { promptTokens, completionTokens }
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_runs_doc on public.document_analysis_runs(document_id);
create index if not exists idx_analysis_runs_status on public.document_analysis_runs(status);

alter table public.document_analysis_runs enable row level security;
create policy "analysis_runs_select" on public.document_analysis_runs for select using (true);
create policy "analysis_runs_insert" on public.document_analysis_runs for insert with check (auth.uid() = created_by);

-- 2. Analysis findings — individual issues detected by AI
create type finding_severity as enum ('info', 'warning', 'critical');
create type finding_category as enum (
  'conflict',           -- overlapping markups by different users
  'inconsistency',      -- measurement mismatch, scale conflict
  'risk',               -- structural concern flagged by AI
  'revision_change',    -- notable delta between revisions
  'suggestion'          -- AI recommendation
);

create table if not exists public.document_analysis_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.document_analysis_runs(id) on delete cascade,
  document_id uuid not null references public.pdf_files(id) on delete cascade,
  severity finding_severity not null default 'info',
  category finding_category not null,
  title text not null,
  description text not null,
  page_number int,
  markup_ids uuid[] default '{}',                   -- related markup(s)
  bounding_box jsonb,                               -- { x, y, width, height } in PDF coords
  ai_confidence real,                               -- 0-1 confidence score
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_findings_run on public.document_analysis_findings(run_id);
create index if not exists idx_findings_doc on public.document_analysis_findings(document_id);
create index if not exists idx_findings_severity on public.document_analysis_findings(severity);

alter table public.document_analysis_findings enable row level security;
create policy "findings_select" on public.document_analysis_findings for select using (true);
create policy "findings_insert" on public.document_analysis_findings for insert with check (true);
create policy "findings_update" on public.document_analysis_findings for update using (true);

-- 3. Workflow triggers — automation rules for notifications + assignments
create table if not exists public.workflow_triggers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,                                  -- null = global trigger
  trigger_event text not null,                      -- MARKUP_CREATED | MARKUP_UPDATED | ANALYSIS_COMPLETE | FINDING_CRITICAL
  action_type text not null,                        -- notify | assign_review | auto_approve | webhook
  action_config jsonb not null default '{}',        -- { notifyRole, assignTo, webhookUrl, ... }
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_triggers_event on public.workflow_triggers(trigger_event);
create index if not exists idx_triggers_project on public.workflow_triggers(project_id);

alter table public.workflow_triggers enable row level security;
create policy "triggers_select" on public.workflow_triggers for select using (true);
create policy "triggers_insert" on public.workflow_triggers for insert with check (auth.uid() = created_by);
create policy "triggers_update" on public.workflow_triggers for update using (auth.uid() = created_by);

-- 4. Workflow execution log — audit trail of triggered actions
create table if not exists public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  trigger_id uuid not null references public.workflow_triggers(id) on delete cascade,
  document_id uuid references public.pdf_files(id),
  event_data jsonb not null default '{}',
  result jsonb,                                     -- { status, message, assignedTo, ... }
  executed_at timestamptz not null default now()
);

create index if not exists idx_executions_trigger on public.workflow_executions(trigger_id);
create index if not exists idx_executions_doc on public.workflow_executions(document_id);

alter table public.workflow_executions enable row level security;
create policy "executions_select" on public.workflow_executions for select using (true);
create policy "executions_insert" on public.workflow_executions for insert with check (true);
