"use client"

import { Avatar } from "@/components/avatar"
import { ChevronLeft, Images, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  company: string | null
  role: string | null
  avatar_color?: string | null
}

interface MessageHeaderProps {
  selectedUser: User | null
  onHeaderClick?: () => void
  onBack?: () => void
  showBackButton?: boolean
}

export function MessageHeader({
  selectedUser,
  onHeaderClick,
  onBack,
  showBackButton,
}: MessageHeaderProps) {
  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim()
    }
    return user.email
  }

  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      {showBackButton && onBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        {!selectedUser ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-black">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Conversation
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
                No contact selected
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onHeaderClick}
            className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-950"
          >
            <Avatar
              firstName={selectedUser.first_name}
              lastName={selectedUser.last_name}
              size="sm"
              role={selectedUser.role}
              avatarColor={
                selectedUser.avatar_color as
                  | "blue"
                  | "red"
                  | "green"
                  | "purple"
                  | "pink"
                  | null
              }
            />

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Active Conversation
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-100">
                {getDisplayName(selectedUser)}
              </div>
              <div className="mt-1 truncate text-xs text-zinc-500">
                {selectedUser.company || selectedUser.role || selectedUser.email}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 sm:inline-flex">
              <Images className="h-3.5 w-3.5" />
              Gallery
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
