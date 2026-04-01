"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"

interface InvitationDetails {
  id: string
  project_id: string
  email: string
  name: string
  role_in_project: string
  status: string
  expires_at: string
  project: {
    name: string
    company: string
  }
  invited_by: {
    first_name: string
    last_name: string
  }
  permissions: {}
  invited_by_user_id: string
}

export function AcceptInvitationClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("project_invitations")
        .select("*, project:projects(name, company), invited_by:users(first_name, last_name)")
        .eq("token", token)
        .single()

      if (fetchError || !data) {
        setError("Invitation not found")
        setLoading(false)
        return
      }

      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        setError("This invitation has expired")
        await supabase.from("project_invitations").update({ status: "expired" }).eq("id", data.id)
        setLoading(false)
        return
      }

      if (data.status === "accepted") {
        setError("This invitation has already been accepted")
        setLoading(false)
        return
      }

      if (data.status === "cancelled") {
        setError("This invitation has been cancelled")
        setLoading(false)
        return
      }

      setInvitation(data)
    } catch (err) {
      console.error("[v0] Error fetching invitation:", err)
      setError("Failed to load invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!invitation) return

    setAccepting(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to accept this invitation")
        setAccepting(false)
        return
      }

      const { data: userProfile } = await supabase.from("users").select("id, email").eq("auth_id", user.id).single()

      if (!userProfile) {
        setError("User profile not found")
        setAccepting(false)
        return
      }

      if (userProfile.email.toLowerCase() !== invitation.email.toLowerCase()) {
        setError("This invitation was sent to a different email address")
        setAccepting(false)
        return
      }

      const { data: existingAssignment } = await supabase
        .from("project_users")
        .select("id")
        .eq("project_id", invitation.project_id)
        .eq("user_id", userProfile.id)
        .maybeSingle()

      if (existingAssignment) {
        setError("You are already assigned to this project")
        setAccepting(false)
        return
      }

      const { error: assignError } = await supabase.from("project_users").insert({
        project_id: invitation.project_id,
        user_id: userProfile.id,
        role_in_project: invitation.role_in_project,
        permissions: invitation.permissions || {},
        status: "active",
        invited_by: invitation.invited_by_user_id,
      })

      if (assignError) {
        console.error("[v0] Error assigning user to project:", assignError)
        setError("Failed to accept invitation. Please try again.")
        setAccepting(false)
        return
      }

      const { error: updateError } = await supabase
        .from("project_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)

      if (updateError) {
        console.error("[v0] Error updating invitation:", updateError)
      }

      setSuccess(true)

      setTimeout(() => {
        router.push(`/project_data/${invitation.project_id}`)
      }, 2000)
    } catch (err) {
      console.error("[v0] Error accepting invitation:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Invalid Invitation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="w-full mt-4" onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle>Invitation Accepted!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You have successfully joined {invitation?.project.name}. Redirecting to the project...
          </p>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!invitation) return null

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Project Invitation</CardTitle>
        <CardDescription>You've been invited to join a project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">Project:</span>
            <span className="text-sm text-muted-foreground">{invitation.project.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">Company:</span>
            <span className="text-sm text-muted-foreground">{invitation.project.company}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">Your Role:</span>
            <span className="text-sm text-muted-foreground capitalize">{invitation.role_in_project}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">Invited By:</span>
            <span className="text-sm text-muted-foreground">
              {invitation.invited_by.first_name} {invitation.invited_by.last_name}
            </span>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            By accepting this invitation, you will be added to the project team and will have access to project
            information based on your assigned role.
          </AlertDescription>
        </Alert>

        <Button className="w-full" onClick={handleAccept} disabled={accepting}>
          {accepting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
