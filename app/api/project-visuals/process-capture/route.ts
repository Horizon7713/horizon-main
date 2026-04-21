import { NextRequest, NextResponse } from "next/server"
import {
  createCaptureProcessingJob,
  processCaptureSessionJob,
} from "@/app/project_visuals/processing-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const captureSessionId = body?.captureSessionId

    if (!captureSessionId) {
      return NextResponse.json(
        { error: "captureSessionId is required." },
        { status: 400 }
      )
    }

    const job = await createCaptureProcessingJob(captureSessionId)
    const result = await processCaptureSessionJob(job.id)

    return NextResponse.json({
      ok: true,
      job: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    )
  }
}