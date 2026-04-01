"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type File, X, Upload, Camera, ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  status: string
  company: string
}

interface FormAttachMediaProps {
  userId: string
  receiverId: string
  onSuccess?: () => void
  onCancel?: () => void
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
}

export function FormAttachMedia({ userId, receiverId, onSuccess, onCancel, sendMessageAction }: FormAttachMediaProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [caption, setCaption] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          console.error("[v0] No authenticated user")
          setLoadingProjects(false)
          return
        }

        // Get user profile
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle()

        if (profileError || !userProfile) {
          console.error("[v0] User profile not found")
          setLoadingProjects(false)
          return
        }

        // Fetch projects where user is the contractor or assigned
        const { data: contractorProjects } = await supabase
          .from("projects")
          .select("id, name, status, company")
          .eq("contractor_user_id", userProfile.id)
          .eq("status", "active")
          .order("name")

        const { data: assignedProjects } = await supabase
          .from("projects")
          .select("id, name, status, company")
          .contains("users", [userProfile.id])
          .eq("status", "active")
          .order("name")

        // Combine and deduplicate projects
        const allProjects = [...(contractorProjects || []), ...(assignedProjects || [])]
        const uniqueProjects = Array.from(new Map(allProjects.map((p) => [p.id, p])).values())

        setProjects(uniqueProjects)
      } catch (err) {
        console.error("[v0] Error fetching projects:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchUserProjects()
  }, [userId])

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
      setError(null)
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
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

    setLoading(true)
    setError(null)

    try {
      const bundleId = crypto.randomUUID()

      // Upload files
      const fileData: Array<{ url: string; mimeType: string }> = []
      for (const file of selectedFiles) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", file)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          let errorMessage = `Failed to upload file: ${file.name}`
          try {
            const errorData = await uploadResponse.json()
            errorMessage = errorData.details || errorData.error || errorMessage
          } catch {
            errorMessage = `${errorMessage} (${uploadResponse.status} ${uploadResponse.statusText})`
          }
          console.error(`[v0] ${errorMessage}`)
          setError(errorMessage)
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

      // Send message with media type
      const formData = new FormData()
      formData.append("content", caption.trim())
      formData.append("fileData", JSON.stringify(fileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId)
      formData.append("currentProject", selectedProject)
      formData.append("messageType", "media")

      const result = await sendMessageAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSelectedFiles([])
        setSelectedProject("")
        setCaption("")
        onSuccess?.()
      }
    } catch (err) {
      console.error("[v0] Error submitting media:", err)
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
        <Label>Files</Label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={loading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          disabled={loading}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={handleFileClick}
            disabled={loading}
          >
            <Upload className="mr-2 size-4" />
            Upload Files
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={handleCameraClick}
            disabled={loading}
          >
            <Camera className="mr-2 size-4" />
            Take Photo/Video
          </Button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-1 mt-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                <ImageIcon className="size-4 text-muted-foreground" />
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
        <Label htmlFor="caption">Caption (Optional)</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption for these files..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || selectedFiles.length === 0 || !selectedProject}>
          {loading ? "Uploading..." : "Attach Files"}
        </Button>
      </div>
    </form>
  )
}
