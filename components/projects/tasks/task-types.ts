export type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed"

export interface Task {
  id: string
  name: string
  phase: string
  status: TaskStatus
  due_date: string | null
  assigned_to: string | null
  description: string | null
  sort_order: number

  depends_on?: string[]
  duration_days?: number | null
  planned_start?: string | null
  planned_end?: string | null

  trade?: string | null
  priority?: string | null
  is_inspection?: boolean
  lag_days?: number

  assigned_to_name?: string | null
  blocker_reason?: string | null
  blocker_note?: string | null

  requires_homeowner_action?: boolean | null
  homeowner_action_text?: string | null
  homeowner_visible_note?: string | null

  last_updated_by?: string | null
  last_updated_at?: string | null

  duration_mode?: "fixed" | "square_foot" | "item_count"
  production_rate?: number | null
  quantity_value?: number | null
  minimum_duration_days?: number
  locked_start_date?: string | null
  locked_end_date?: string | null

  is_critical?: boolean | null
  total_float_days?: number | null
  early_start_day?: number | null
  early_end_day?: number | null
  late_start_day?: number | null
  late_end_day?: number | null

  quantity_source?:
    | "manual"
    | "project_square_feet"
    | "project_bathroom_count"
    | "project_window_count"
    | "project_door_count"
    | "project_cabinet_count"
}

export type ProjectEventType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_status_changed"
  | "schedule_built"
  | "project_update_created"
  | "project_update_updated"
  | "project_update_deleted"
  | "project_update_published"
  | "project_update_unpublished"
  | "homeowner_action_flagged"

export interface ProjectEvent {
  id: string
  project_id: string
  task_id?: string | null
  project_update_id?: string | null
  event_type: ProjectEventType
  title: string
  details?: string | null
  actor_user_id?: string | null
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ProjectTasksProps {
  projectId: string
  projectType?: string
}

export interface ProjectCopilotRecap {
  summary: string
  risks: string[]
  next_actions: string[]
  homeowner_update: string
}

export interface HomeownerActionItem {
  id: string
  name: string
  phase: string
  due_date?: string | null
  planned_start?: string | null
  planned_end?: string | null
  homeowner_action_text?: string | null
  homeowner_visible_note?: string | null
  is_critical?: boolean | null
  total_float_days?: number | null
  blocker_reason?: string | null
  blocker_note?: string | null
}

export interface ProjectHealthBucketItem {
  id: string
  name: string
  phase: string
  status: TaskStatus
  due_date?: string | null
  planned_start?: string | null
  planned_end?: string | null
  requires_homeowner_action?: boolean | null
  homeowner_action_text?: string | null
  blocker_reason?: string | null
  blocker_note?: string | null
  is_critical?: boolean | null
  total_float_days?: number | null
}

export type ProjectUpdateType =
  | "progress"
  | "delay"
  | "milestone"
  | "selection_needed"
  | "issue"
  | "inspection"

export interface ProjectUpdate {
  id: string
  project_id: string
  task_id?: string | null
  type: ProjectUpdateType
  title: string
  internal_summary?: string | null
  homeowner_summary?: string | null
  requires_homeowner_action: boolean
  action_deadline?: string | null
  is_published: boolean
  published_at?: string | null
  source_type?: "manual" | "ai_generated" | "system"
  confidence_score?: number | null
  created_by?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ProjectUpdateSuggestion {
  key: string
  type: ProjectUpdateType
  title: string
  internal_summary: string
  homeowner_summary: string
  requires_homeowner_action: boolean
  reason: string
}

export const PROJECT_UPDATE_TYPE_OPTIONS = [
  { value: "progress", label: "Progress" },
  { value: "delay", label: "Delay" },
  { value: "milestone", label: "Milestone" },
  { value: "selection_needed", label: "Selection Needed" },
  { value: "issue", label: "Issue" },
  { value: "inspection", label: "Inspection" },
] as const

export const TRADE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "sitework", label: "Sitework" },
  { value: "concrete", label: "Concrete" },
  { value: "framing", label: "Framing" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "insulation", label: "Insulation" },
  { value: "drywall", label: "Drywall" },
  { value: "paint", label: "Paint" },
  { value: "finish_carpentry", label: "Finish Carpentry" },
  { value: "flooring", label: "Flooring" },
  { value: "cabinetry", label: "Cabinetry" },
  { value: "landscape", label: "Landscape" },
] as const

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const

export const PHASE_OPTIONS = [
  { value: "sitework", label: "Sitework" },
  { value: "foundation", label: "Foundation" },
  { value: "framing", label: "Framing" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "rough_in", label: "Rough In" },
  { value: "insulation", label: "Insulation" },
  { value: "drywall", label: "Drywall" },
  { value: "interior_finish", label: "Interior Finish" },
  { value: "cabinetry", label: "Cabinetry" },
  { value: "flooring", label: "Flooring" },
  { value: "punch_list", label: "Punch List" },
] as const

export const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
] as const

export const BLOCKER_REASON_OPTIONS = [
  { value: "dependency_not_complete", label: "Dependency Not Complete" },
  { value: "waiting_on_homeowner", label: "Waiting on Homeowner" },
  { value: "waiting_on_subcontractor", label: "Waiting on Subcontractor" },
  { value: "waiting_on_materials", label: "Waiting on Materials" },
  { value: "inspection_issue", label: "Inspection Issue" },
  { value: "weather", label: "Weather" },
  { value: "permit_issue", label: "Permit Issue" },
  { value: "change_order", label: "Change Order" },
  { value: "other", label: "Other" },
] as const