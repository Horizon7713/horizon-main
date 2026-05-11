"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Clock, File, ImageIcon, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  status: string
  company: string
}

interface R2SignResponse {
  uploadUrl?: string
  signedUrl?: string
  publicUrl?: string
  fileUrl?: string
  url?: string
  contentType?: string
}

interface FormNewTimecardProps {
  userId: string
  receiverId: string
  onSuccess?: () => void
  onCancel?: () => void
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
}

const WORK_TYPES = [
  "Framing",
  "Concrete",
  "Excavation",
  "Finish",
  "Landscaping",
  "Metal",
  "Painting",
  "Appliance Install",
]

const HOUR_OPTIONS = Array.from({ length: 11 }, (_, index) => index)
const MINUTE_OPTIONS = [0, 15, 30, 45]

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function getUploadUrl(signResult: R2SignResponse) {
  return signResult.uploadUrl || signResult.signedUrl || ""
}

function getPublicR2Url(signResult: R2SignResponse) {
  return signResult.publicUrl || signResult.fileUrl || signResult.url || ""
}

function getUploadMimeType(signResult: R2SignResponse, fallback: string) {
  return signResult.contentType || fallback || "application/octet-stream"
}

function formatDuration(hours: string, minutes: string) {
  const hourNumber = Number(hours || 0)
  const minuteNumber = Number(minutes || 0)

  const hourLabel = `${hourNumber} ${hourNumber === 1 ? "hour" : "hours"}`
  const minuteLabel = `${minuteNumber} min`

  return `${hourLabel} ${minuteLabel}`
}

export function FormNewTimecard({
  userId,
  receiverId,
  onSuccess,
  onCancel,
  sendMessageAction,
}: FormNewTimecardProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedWork, setSelectedWork] = useState("")
  const [durationHours, setDurationHours] = useState("0")
  const [durationMinutes, setDurationMinutes] = useState("0")
  const [notes, setNotes] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const totalDurationMinutes = useMemo(() => {
    return Number(durationHours || 0) * 60 + Number(durationMinutes || 0)
  }, [durationHours, durationMinutes])

  const canSubmit = useMemo(() => {
    return Boolean(
      selectedFiles.length > 0 &&
        selectedProject &&
        selectedWork &&
        totalDurationMinutes > 0 &&
        !loading,
    )
  }, [loading, selectedFiles.length, selectedProject, selectedWork, totalDurationMinutes])

  useEffect(() => {
    async function fetchUserProjects() {
      try {
        const { data: userProfile, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", userId)
          .single()

        if (userError || !userProfile) {
          console.error("[FormNewTimecard] User profile not found:", userError)
          return
        }

        const { data, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, status, company")
          .eq("status", "active")
          .contains("users", [userProfile.id])
          .order("name")

        if (projectsError) {
          console.error("[FormNewTimecard] Error fetching projects:", projectsError)
          return
        }

        setProjects(data || [])
      } catch (err) {
        console.error("[FormNewTimecard] Unexpected project fetch error:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchUserProjects()
  }, [userId])

  const resetFileInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (photosInputRef.current) photosInputRef.current.value = ""
  }

  const resetForm = () => {
    setSelectedFiles([])
    setSelectedProject("")
    setSelectedWork("")
    setDurationHours("0")
    setDurationMinutes("0")
    setNotes("")
    setError(null)
    resetFileInputs()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) return

    setError(null)

    setSelectedFiles((previous) => {
      const existingKeys = new Set(previous.map(getFileKey))
      const newUniqueFiles = files.filter((file) => !existingKeys.has(getFileKey(file)))

      return [...previous, ...newUniqueFiles]
    })

    event.target.value = ""
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
    resetFileInputs()
  }

  const getR2SignedUpload = async (file: File) => {
    const response = await fetch("/api/uploads/r2/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        mimeType: file.type || "application/octet-stream",
        folder: "timecards",
        type: "timecard",
        projectId: selectedProject || null,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      throw new Error(result.error || `Failed to create Cloudflare R2 upload URL for ${file.name}`)
    }

    const uploadUrl = getUploadUrl(result)
    const publicUrl = getPublicR2Url(result)

    if (!uploadUrl) {
      throw new Error("Cloudflare R2 signing response did not include uploadUrl or signedUrl.")
    }

    if (!publicUrl) {
      throw new Error("Cloudflare R2 signing response did not include publicUrl, fileUrl, or url.")
    }

    return result as R2SignResponse
  }

  const uploadFilesToR2 = async () => {
    const uploadedFiles: Array<{ url: string; mimeType: string }> = []
    const uniqueFiles = selectedFiles.filter(
      (file, index, array) =>
        index === array.findIndex((otherFile) => getFileKey(otherFile) === getFileKey(file)),
    )

    for (const file of uniqueFiles) {
      const signResult = await getR2SignedUpload(file)
      const uploadUrl = getUploadUrl(signResult)
      const publicUrl = getPublicR2Url(signResult)
      const contentType = file.type || "application/octet-stream"

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload ${file.name} to Cloudflare R2.`)
      }

      uploadedFiles.push({
        url: publicUrl,
        mimeType: getUploadMimeType(signResult, contentType),
      })
    }

    return uploadedFiles
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (submittingRef.current) return

    if (selectedFiles.length === 0) {
      setError("Please take a photo or upload at least one image.")
      return
    }

    if (!selectedProject) {
      setError("Please select a project.")
      return
    }

    if (!selectedWork) {
      setError("Please select a work type.")
      return
    }

    if (totalDurationMinutes <= 0) {
      setError("Please select how long the work took.")
      return
    }

    submittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const bundleId = crypto.randomUUID()
      const fileData = await uploadFilesToR2()

      if (fileData.length === 0) {
        setError("Failed to upload files.")
        return
      }

      const durationLabel = formatDuration(durationHours, durationMinutes)
      const messageContent = notes.trim() || `Timecard submitted for ${selectedWork}: ${durationLabel}`

      const formData = new FormData()
      formData.append("content", messageContent)
      formData.append("fileData", JSON.stringify(fileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId)
      formData.append("currentProject", selectedProject)
      formData.append("messageType", "timecard")
      formData.append("progressUpdate", selectedWork)
      formData.append("durationMinutes", String(totalDurationMinutes))

      const result = await sendMessageAction(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      resetForm()
      onSuccess?.()
    } catch (err) {
      console.error("[FormNewTimecard] Error submitting timecard:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden px-1 sm:max-h-none sm:px-0">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pb-4 sm:space-y-4 sm:overflow-visible sm:pr-0">
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-zinc-100">Timecard photos</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Take a photo or choose images from your device.
              </p>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <input
              ref={photosInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full bg-transparent sm:h-10"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
              >
                <Camera className="mr-2 size-4" />
                Take Photo
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full bg-transparent sm:h-10"
                onClick={() => photosInputRef.current?.click()}
                disabled={loading}
              >
                <ImageIcon className="mr-2 size-4" />
                Upload from Photos
              </Button>
            </div>

            {selectedFiles.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={getFileKey(file)}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300"
                  >
                    <File className="size-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-zinc-100">Timecard details</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Select the project, work type, and how long the work took.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project" className="text-xs font-medium text-zinc-300">
                  Project
                </Label>

                <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loading || loadingProjects}>
                  <SelectTrigger id="project" className="h-11 w-full sm:h-10">
                    <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="work" className="text-xs font-medium text-zinc-300">
                  Work
                </Label>

                <Select value={selectedWork} onValueChange={setSelectedWork} disabled={loading}>
                  <SelectTrigger id="work" className="h-11 w-full sm:h-10">
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((workType) => (
                      <SelectItem key={workType} value={workType}>
                        {workType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-zinc-300">Time worked</Label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={durationHours}
                      onChange={(event) => setDurationHours(event.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-800 bg-black pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-zinc-700 sm:h-10"
                      disabled={loading}
                    >
                      {HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={String(hour)}>
                          {hour} {hour === 1 ? "hour" : "hours"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none focus:border-zinc-700 sm:h-10"
                    disabled={loading}
                  >
                    {MINUTE_OPTIONS.map((minute) => (
                      <option key={minute} value={String(minute)}>
                        {minute} min
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-zinc-500">
                  Select how long the work took, for example 2 hours or 1 hour 30 minutes.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <Label htmlFor="notes" className="text-xs font-medium text-zinc-300">
              Notes (Optional)
            </Label>

            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any notes about this timecard..."
              rows={4}
              className="mt-2 rounded-xl border-zinc-800 bg-black text-sm text-zinc-100 placeholder:text-zinc-500"
              disabled={loading}
            />
          </section>
        </div>

        <div className="shrink-0 border-t border-zinc-800 bg-black/95 p-3 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            ) : null}

            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {loading ? "Submitting..." : "Submit Timecard"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
