"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { File, X, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  status: string
  company: string
}

interface FormNewTimecardProps {
  userId: string
  receiverId: string
  onSuccess?: () => void
  onCancel?: () => void
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
}

export function FormNewTimecard({ userId, receiverId, onSuccess, onCancel, sendMessageAction }: FormNewTimecardProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedWork, setSelectedWork] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        // Get current user's profile ID
        const { data: userProfile } = await supabase.from("users").select("id").eq("auth_id", userId).single()

        if (!userProfile) {
          console.error("[v0] User profile not found")
          setLoadingProjects(false)
          return
        }

        // Fetch projects where user is assigned
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, company")
          .eq("status", "active")
          .contains("users", [userProfile.id])
          .order("name")

        if (error) {
          console.error("[v0] Error fetching projects:", error)
        } else {
          setProjects(data || [])
        }
      } catch (err) {
        console.error("[v0] Error fetching projects:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchUserProjects()
  }, [userId])

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFiles.length === 0) {
      setError("Please select at least one file")
      return
    }

    if (!selectedProject) {
      setError("Please select a project")
      return
    }

    if (!selectedWork) {
      setError("Please select a work type")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const bundleId = crypto.randomUUID()

      // Upload all files
      const fileData: Array<{ url: string; mimeType: string }> = []
      for (const file of selectedFiles) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", file)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          console.error(`[v0] Failed to upload file: ${file.name}`)
          continue
        }

        const uploadResult = await uploadResponse.json()
        fileData.push({
          url: uploadResult.url,
          mimeType: uploadResult.type,
        })
      }

      if (fileData.length === 0) {
        setError("Failed to upload files")
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append("content", notes.trim())
      formData.append("fileData", JSON.stringify(fileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId)
      formData.append("currentProject", selectedProject)
      formData.append("messageType", "timecard")
      formData.append("progressUpdate", selectedWork)

      const result = await sendMessageAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        // Reset form
        setSelectedFiles([])
        setSelectedProject("")
        setSelectedWork("")
        setNotes("")
        onSuccess?.()
      }
    } catch (err) {
      console.error("[v0] Error submitting timecard:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Timecard Files/Images</Label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={loading}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full bg-transparent"
          onClick={handleFileClick}
          disabled={loading}
        >
          <Upload className="mr-2 size-4" />
          Upload Files
        </Button>

        {selectedFiles.length > 0 && (
          <div className="space-y-1 mt-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                <File className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => handleRemoveFile(index)}
                  disabled={loading}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project">Project</Label>
        <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loading || loadingProjects}>
          <SelectTrigger id="project" className="w-full">
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

      <div className="space-y-2">
        <Label htmlFor="work">Work</Label>
        <Select value={selectedWork} onValueChange={setSelectedWork} disabled={loading}>
          <SelectTrigger id="work" className="w-full">
            <SelectValue placeholder="Select work type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Framing">Framing</SelectItem>
            <SelectItem value="Concrete">Concrete</SelectItem>
            <SelectItem value="Finish">Finish</SelectItem>
            <SelectItem value="Metal">Metal</SelectItem>
            <SelectItem value="Painting">Painting</SelectItem>
            <SelectItem value="Appliance Install">Appliance Install</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this timecard..."
          rows={4}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || selectedFiles.length === 0 || !selectedProject || !selectedWork}>
          {loading ? "Submitting..." : "Submit Timecard"}
        </Button>
      </div>
    </form>
  )
}
