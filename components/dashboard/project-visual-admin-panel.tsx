"use client"

import { CaptureProcessingStatus } from "./capture-processing-status"
import { CaptureSessionUploader } from "./capture-session-uploader"
import { HouseModelEditor } from "./house-model-editor"

type ProjectVisualAdminPanelProps = {
  projectId: string
}

export function ProjectVisualAdminPanel({
  projectId,
}: ProjectVisualAdminPanelProps) {
  return (
    <div className="space-y-5">
      <HouseModelEditor projectId={projectId} />
      <CaptureSessionUploader projectId={projectId} />
      <CaptureProcessingStatus projectId={projectId} />
    </div>
  )
}