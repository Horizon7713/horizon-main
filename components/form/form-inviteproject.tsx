"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { Copy, Check, Loader2 } from "lucide-react"

interface Project {
  id: string
  name: string
  status: string
  company: string
}

interface FormInviteProjectProps {
  userId: string
  onCancel?: () => void
}

export function FormInviteProject({ userId, onCancel }: FormInviteProjectProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [lookingUpEmail, setLookingUpEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        // Fetch projects where user is the contractor
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, company")
          .eq("contractor_user_id", userId)
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

  const handleEmailLookup = async (emailValue: string) => {
    const trimmedEmail = emailValue.toLowerCase().trim()

    // Only lookup if email looks valid
    if (!trimmedEmail.includes("@")) {
      return
    }

    setLookingUpEmail(true)

    try {
      // Query users table to find user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, first_name, last_name, role")
        .eq("email", trimmedEmail)
        .maybeSingle()

      if (userError) {
        console.error("[v0] Error looking up user:", userError)
      } else if (userData) {
        console.log("[v0] Found user:", userData)

        // Auto-fill name if available
        if (userData.first_name || userData.last_name) {
          const fullName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
          setName(fullName)
        }

        // Auto-fill role based on user's role in database
        if (userData.role) {
          const userRole = userData.role.toLowerCase()
          // Map database role to project role options
          if (userRole === "contractor") {
            setRole("contractor")
          } else if (userRole === "subcontractor") {
            setRole("subcontractor")
          } else if (userRole === "homeowner") {
            setRole("homeowner")
          } else if (userRole === "employee") {
            setRole("employee")
          }
        }
      } else {
        console.log("[v0] No user found with email:", trimmedEmail)
      }
    } catch (err) {
      console.error("[v0] Error during email lookup:", err)
    } finally {
      setLookingUpEmail(false)
    }
  }

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) {
      setError("Please select a project")
      return
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (!name.trim()) {
      setError("Please enter the invitee's name")
      return
    }

    if (!role) {
      setError("Please select a role for the invitee")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generate unique token
      const token = crypto.randomUUID()

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("project_invitations")
        .insert({
          project_id: selectedProject,
          invited_by_user_id: userId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role_in_project: role,
          permissions: {},
          token: token,
          status: "pending",
        })
        .select()
        .single()

      if (inviteError) {
        console.error("[v0] Error creating invitation:", inviteError)
        setError("Failed to create invitation. Please try again.")
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/invitations/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId: invitation.id }),
        })

        if (!response.ok) {
          console.error("[v0] Failed to send invitation email")
          // Don't fail the whole process if email fails
        } else {
          console.log("[v0] Invitation email sent successfully")
        }
      } catch (emailError) {
        console.error("[v0] Error sending invitation email:", emailError)
        // Don't fail the whole process if email fails
      }

      // Generate invitation link
      const baseUrl = window.location.origin
      const link = `${baseUrl}/accept-invitation?token=${token}`

      setInvitationLink(link)
      console.log("[v0] Invitation created successfully:", invitation)
    } catch (err) {
      console.error("[v0] Error generating invitation:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!invitationLink) return

    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[v0] Failed to copy link:", err)
    }
  }

  const handleReset = () => {
    setInvitationLink(null)
    setEmail("")
    setName("")
    setRole("")
    setSelectedProject("")
    setError(null)
  }

  if (invitationLink) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Invitation Link Generated</Label>
          <p className="text-sm text-muted-foreground">Share this link with {name} to invite them to the project.</p>
        </div>

        <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono">{invitationLink}</div>

        <div className="flex gap-2">
          <Button type="button" onClick={handleCopyLink} className="flex-1">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Create Another
          </Button>
        </div>

        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
            Close
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerateLink} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="project">Select Project</Label>
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
        <Label htmlFor="email">Invitee Email</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => handleEmailLookup(e.target.value)}
            placeholder="john@example.com"
            disabled={loading}
            required
          />
          {lookingUpEmail && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Role will be auto-filled if user exists in the system</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Invitee Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role in Project</Label>
        <Select value={role} onValueChange={setRole} disabled={loading}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contractor">Contractor</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="homeowner">Homeowner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || loadingProjects}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Invitation Link"
          )}
        </Button>
      </div>
    </form>
  )
}
