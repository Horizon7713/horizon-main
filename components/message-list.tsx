"use client"

import { useState } from "react"
import { Avatar } from "@/components/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquarePlus, Users } from "lucide-react"
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
  currentUserRole: string | null
  currentUserId: string
}

export function MessageList({
  users,
  selectedUserId,
  onSelectUser,
  currentUserRole,
  currentUserId,
}: MessageListProps) {
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
          return user.role.toLowerCase() === activeFilter.toLowerCase()
        })

  const roleFilters = ["Subcontractor", "Employee", "Contractor", "Homeowner"]

  const canInviteUsers =
    currentUserRole?.toLowerCase() === "contractor" ||
    currentUserRole?.toLowerCase() === "subcontractor"

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {showInviteView ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInviteView(false)}
              className="h-9 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Contacts
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                  <Users className="h-4 w-4 text-zinc-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    Message Directory
                  </div>
                  <div className="text-xs text-zinc-500">
                    {filteredUsers.length} available contact{filteredUsers.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showInviteView && canInviteUsers ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInviteView(true)}
              className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          ) : null}
        </div>

        {currentUserRole?.toLowerCase() === "contractor" && !showInviteView ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {roleFilters.map((filter) => {
              const active = activeFilter === filter

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => toggleFilter(filter)}
                  className={[
                    "inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
                    active
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {showInviteView && canInviteUsers ? (
          <div className="p-4">
            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Project Access
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-100">
                Invite to Project
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Add contacts into a project communication flow.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black p-4">
              <FormInviteProject
                userId={currentUserId}
                onCancel={() => setShowInviteView(false)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-10 text-center">
                <p className="text-sm font-medium text-zinc-200">No users found</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Try clearing the current role filter.
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const selected = selectedUserId === user.id

                return (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={[
                      "w-full rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-amber-500/20 bg-zinc-950 text-zinc-100 shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                        : "border-zinc-800 bg-black text-zinc-100 hover:border-zinc-700 hover:bg-zinc-950",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={user.first_name}
                        lastName={user.last_name}
                        size="md"
                        role={user.role}
                        avatarColor={
                          user.avatar_color as
                            | "blue"
                            | "red"
                            | "green"
                            | "purple"
                            | "pink"
                            | null
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {getDisplayName(user)}
                        </p>

                        {user.company ? (
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {user.company}
                          </p>
                        ) : (
                          <p className="mt-1 truncate text-xs text-zinc-600">
                            {user.role || "User"}
                          </p>
                        )}
                      </div>

                      {selected ? (
                        <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                          Active
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
