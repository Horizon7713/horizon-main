"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { HouseModelSchema } from "@/lib/house-model/schema"
import {
  AddCaptureImageInput,
  AddCaptureOutputInput,
  CreateCaptureSessionInput,
  CreateHouseModelInput,
} from "@/lib/project-visuals/types"

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

export async function getLatestHouseModel(projectId: string) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_house_models")
    .select("id, project_id, version, schema, status, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return data?.[0] || null
}

export async function saveHouseModel(input: CreateHouseModelInput) {
  const { supabase, profile } = await getCurrentUserProfile()

  const { data: latestRows, error: latestError } = await supabase
    .from("project_house_models")
    .select("version")
    .eq("project_id", input.projectId)
    .order("version", { ascending: false })
    .limit(1)

  if (latestError) {
    throw new Error(latestError.message)
  }

  const nextVersion = (latestRows?.[0]?.version || 0) + 1

  const payload = {
    project_id: input.projectId,
    version: nextVersion,
    schema: input.schema as HouseModelSchema,
    status: input.status || "ready",
    created_by: profile.id,
  }

  const { data, error } = await supabase
    .from("project_house_models")
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  return data
}

export async function createCaptureSession(input: CreateCaptureSessionInput) {
  const { supabase, profile } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_sessions")
    .insert({
      project_id: input.projectId,
      milestone_key: input.milestoneKey || null,
      notes: input.notes || null,
      captured_by: profile.id,
      status: "uploaded",
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  return data
}

export async function addCaptureImage(input: AddCaptureImageInput) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_images")
    .insert({
      capture_session_id: input.captureSessionId,
      file_path: input.filePath,
      shot_type: input.shotType || null,
      sort_order: input.sortOrder || 0,
      metadata: input.metadata || {},
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  return data
}

export async function addCaptureOutput(input: AddCaptureOutputInput) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_outputs")
    .insert({
      capture_session_id: input.captureSessionId,
      output_type: input.outputType,
      file_path: input.filePath,
      metadata: input.metadata || {},
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  return data
}

export async function getProjectCaptureSessions(projectId: string) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_sessions")
    .select(`
      id,
      project_id,
      milestone_key,
      capture_date,
      status,
      notes,
      project_capture_images (
        id,
        file_path,
        shot_type,
        sort_order,
        metadata
      ),
      project_capture_outputs (
        id,
        output_type,
        file_path,
        metadata
      )
    `)
    .eq("project_id", projectId)
    .order("capture_date", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((session: any) => ({
    id: session.id,
    project_id: session.project_id,
    milestone_key: session.milestone_key,
    capture_date: session.capture_date,
    status: session.status,
    notes: session.notes,
    images: session.project_capture_images || [],
    outputs: session.project_capture_outputs || [],
  }))
}

export async function getLatestProjectCaptureStage(projectId: string) {
  const { supabase } = await getCurrentUserProfile()

  const { data, error } = await supabase
    .from("project_capture_processing_jobs")
    .select(`
      id,
      project_id,
      capture_session_id,
      status,
      detected_stage,
      confidence,
      summary,
      result,
      completed_at,
      created_at
    `)
    .eq("project_id", projectId)
    .eq("status", "completed")
    .not("detected_stage", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return data?.[0] || null
}
