import { Suspense } from "react"
import { AcceptInvitationClient } from "@/components/accept-invitation-client"

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg">
            <div className="text-center">Loading invitation...</div>
          </div>
        }
      >
        <AcceptInvitationClient />
      </Suspense>
    </div>
  )
}
