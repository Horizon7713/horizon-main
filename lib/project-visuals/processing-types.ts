import { HomeownerVisualStage } from "@/components/dashboard/homeowner-dashboard-utils"

export type CaptureProcessingJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"

export type CaptureProcessingJobRecord = {
  id: string
  capture_session_id: string
  project_id: string
  status: CaptureProcessingJobStatus
  processor: string
  detected_stage: HomeownerVisualStage | null
  confidence: number | null
  summary: string | null
  result: Record<string, unknown>
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type StageDetectionResult = {
  detectedStage: HomeownerVisualStage
  confidence: number
  summary: string
  result: {
    source: string
    milestoneKey?: string | null
    noteSignals: string[]
    imageSignals: string[]
    imageCount: number
  }
}