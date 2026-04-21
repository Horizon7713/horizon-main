"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { detectStageFromCaptureSession } from "@/lib/project-visuals/stage-detection"

async function getCurrentUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("You must be signed in.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, auth_id, role")
    .eq("auth_id", user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("Unable to load user profile.")
  }

  return { supabase, user, profile }
}

export async function createCaptureProcessingJob(captureSessionId: string) {
  const { supabase, profile } = await getCurrentUserProfile()

  const { data: session, error: sessionError } = await supabase
    .from("project_capture_sessions")
    .select("id, project_id")
    .eq("id", captureSessionId)
    .single()

  if (sessionError || !session) {
    throw new Error("Capture session not found.")
  }

  const { data, error } = await supabase
    .from("project_capture_processing_jobs")
    .insert({
      capture_session_id: session.id,
      project_id: session.project_id,
      status: "queued",
      processor: "stage-detector-v1",
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  return data
}

export async function processCaptureSessionJob(jobId: string) {
  const { supabase } = await getCurrentUserProfile()

  const { data: job, error: jobError } = await supabase
    .from("project_capture_processing_jobs")
    .select("id, capture_session_id, project_id")
    .eq("id", jobId)
    .single()

  if (jobError || !job) {
    throw new Error("Processing job not found.")
  }

  const { error: runningError } = await supabase
    .from("project_capture_processing_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", job.id)

  if (runningError) {
    throw new Error(runningError.message)
  }

  const { data: session, error: sessionError } = await supabase
    .from("project_capture_sessions")
    .select(`
      id,
      project_id,
      milestone_key,
      notes,
      project_capture_images (
        id,
        file_path,
        shot_type,
        metadata
      )
    `)
    .eq("id", job.capture_session_id)
    .single()

  if (sessionError || !session) {
    await supabase
      .from("project_capture_processing_jobs")
      .update({
        status: "failed",
        error_message: "Capture session could not be loaded.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    throw new Error("Capture session could not be loaded.")
  }

  try {
    const detection = detectStageFromCaptureSession({
      milestone_key: session.milestone_key,
      notes: session.notes,
      images: session.project_capture_images || [],
    })

    const { data: updatedJob, error: updateError } = await supabase
      .from("project_capture_processing_jobs")
      .update({
        status: "completed",
        detected_stage: detection.detectedStage,
        confidence: detection.confidence,
        summary: detection.summary,
        result: detection.result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    revalidatePath("/dashboard")
    return updatedJob
  } catch (error) {
    await supabase
      .from("project_capture_processing_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown processing error.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    throw error
  }
}

export async function getLatestProcessingResult(captureSessionId: string) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_processing_jobs")
    .select("*")
    .eq("capture_session_id", captureSessionId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return data?.[0] || null
}