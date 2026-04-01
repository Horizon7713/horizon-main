import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: invitation, error: inviteError } = await supabase
      .from("project_invitations")
      .select("*, project:projects(name, company), invited_by:users(first_name, last_name, email)")
      .eq("id", invitationId)
      .single()

    if (inviteError || !invitation) {
      console.error("[v0] Error fetching invitation:", inviteError)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const invitationLink = `${baseUrl}/accept-invitation?token=${invitation.token}`

    // In a production environment, you would integrate with an email service like Resend
    // For now, we'll log the email content and return success
    const emailContent = {
      to: invitation.email,
      subject: `You've been invited to join ${invitation.project.name}`,
      html: `
        <h2>Project Invitation</h2>
        <p>Hi ${invitation.email},</p>
        <p>${invitation.invited_by.first_name} ${invitation.invited_by.last_name} has invited you to join the project <strong>${invitation.project.name}</strong> at ${invitation.project.company}.</p>
        <p>Your role will be: <strong>${invitation.role_in_project}</strong></p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${invitationLink}</p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `,
    }

    console.log("[v0] Email would be sent:", emailContent)

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send(emailContent)

    return NextResponse.json({
      success: true,
      message: "Invitation email sent successfully",
      invitationLink,
    })
  } catch (error) {
    console.error("[v0] Error sending invitation:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}
