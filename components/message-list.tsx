"use client"

import { useState } from "react"
import { Avatar } from "@/components/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquarePlus } from "lucide-react"
import { FormInviteProject } from "@/components/form/form-inviteproject"

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  company: string | null
  role: string | null
  avatar_color?: string | null
}

interface MessageListProps {
  users: User[]
  selectedUserId?: string
  onSelectUser: (user: User) => void
  currentUserRole: string | null // Added currentUserRole prop
  currentUserId: string // Added currentUserId prop
}

export function MessageList({ users, selectedUserId, onSelectUser, currentUserRole, currentUserId }: MessageListProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showInviteView, setShowInviteView] = useState(false)

  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim()
    }
    return user.email
  }

  const toggleFilter = (filter: string) => {
    setActiveFilter((prev) => (prev === filter ? null : filter))
  }

  const filteredUsers =
    activeFilter === null
      ? users
      : users.filter((user) => {
          if (!user.role) return false
          // Case-insensitive comparison
          return user.role.toLowerCase() === activeFilter.toLowerCase()
        })

  const roleFilters = ["Subcontractor", "Employee", "Contractor", "Homeowner"]

  console.log(
    "[v0] Users and their roles:",
    users.map((u) => ({ email: u.email, role: u.role })),
  )
  console.log("[v0] Active filter:", activeFilter)
  console.log("[v0] Filtered users count:", filteredUsers.length)

  const canInviteUsers =
    currentUserRole?.toLowerCase() === "contractor" || currentUserRole?.toLowerCase() === "subcontractor"

  return (
    <div className="h-screen flex flex-col border-r bg-card md:pt-[0rem] pt-[3rem]">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {showInviteView ? (
            <Button variant="ghost" size="sm" onClick={() => setShowInviteView(false)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <h2 className="text-lg font-semibold md:block hidden">Messages</h2>
          )}
          {!showInviteView && canInviteUsers && (
            <Button variant="ghost" size="icon" onClick={() => setShowInviteView(true)}>
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          )}
        </div>
        {currentUserRole?.toLowerCase() === "contractor" && !showInviteView && (
          <div className="flex flex-wrap gap-2 mt-3">
            {roleFilters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(filter)}
                className="text-xs h-7"
              >
                {filter}
              </Button>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        {showInviteView && canInviteUsers ? (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Invite to Project</h3>
            <FormInviteProject userId={currentUserId} onCancel={() => setShowInviteView(false)} />
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left ${
                    selectedUserId === user.id ? "bg-accent" : ""
                  }`}
                >
                  <Avatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                    size="md"
                    role={user.role}
                    avatarColor={user.avatar_color as "blue" | "red" | "green" | "purple" | "pink" | null}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getDisplayName(user)}</p>
                    {user.company && <p className="text-xs text-muted-foreground truncate">{user.company}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
