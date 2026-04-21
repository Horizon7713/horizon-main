export type CaptureShotType =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "front_left_corner"
  | "front_right_corner"
  | "rear_left_corner"
  | "rear_right_corner"
  | "perimeter"
  | "interior"
  | "detail"

export type CaptureOutputType =
  | "gallery_preview"
  | "thumbnail"
  | "mesh"
  | "point_cloud"
  | "splat"
  | "video"

export type SiteCaptureImage = {
  id: string
  file_path: string
  shot_type?: CaptureShotType | null
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
}

export type SiteCaptureOutput = {
  id: string
  output_type: CaptureOutputType
  file_path: string
  metadata?: Record<string, unknown> | null
}

export type SiteCaptureSession = {
  id: string
  project_id: string
  milestone_key?: string | null
  capture_date: string
  status: "uploaded" | "processing" | "ready" | "failed"
  notes?: string | null
  images?: SiteCaptureImage[]
  outputs?: SiteCaptureOutput[]
}

export function getLatestReadyCaptureSession(
  sessions: SiteCaptureSession[] | null | undefined,
) {
  return [...(sessions || [])]
    .filter((session) => session.status === "ready")
    .sort((a, b) => {
      return new Date(b.capture_date).getTime() - new Date(a.capture_date).getTime()
    })[0] || null
}