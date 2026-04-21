import { HouseModelSchema } from "@/lib/house-model/schema"
import { SiteCaptureSession } from "@/lib/site-capture/capture-session"

export type ProjectHouseModelRecord = {
  id: string
  project_id: string
  version: number
  schema: HouseModelSchema
  status: "pending" | "processing" | "ready" | "failed"
  created_at: string
  updated_at: string
}

export type CreateCaptureSessionInput = {
  projectId: string
  milestoneKey?: string
  notes?: string
}

export type CreateHouseModelInput = {
  projectId: string
  schema: HouseModelSchema
  status?: "pending" | "processing" | "ready" | "failed"
}

export type AddCaptureImageInput = {
  captureSessionId: string
  filePath: string
  shotType?: string
  sortOrder?: number
  metadata?: Record<string, unknown>
}

export type AddCaptureOutputInput = {
  captureSessionId: string
  outputType: string
  filePath: string
  metadata?: Record<string, unknown>
}

export type ProjectCaptureSessionRecord = SiteCaptureSession