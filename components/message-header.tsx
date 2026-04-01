"use client"

import { Avatar } from "@/components/avatar"
import { ChevronLeft } from "lucide-react"
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

export function MessageHeader({ selectedUser, onHeaderClick, onBack, showBackButton }: MessageHeaderProps) {
  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim()
    }
    return user.email
  }

  return (
    <div className="flex items-center space-x-3 py-3 px-4 sm:px-6 border-b border-gray-200">
      {showBackButton && onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      <h3 className="text-2xl font-semibold leading-none tracking-tight flex-1 min-w-0">
        {selectedUser ? (
          <button
            onClick={onHeaderClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
          >
            <Avatar
              firstName={selectedUser.first_name}
              lastName={selectedUser.last_name}
              size="sm"
              role={selectedUser.role}
              avatarColor={selectedUser.avatar_color as "blue" | "red" | "green" | "purple" | "pink" | null}
            />
            <span className="text-[1rem] truncate">{getDisplayName(selectedUser)}</span>
          </button>
        ) : (
          "Chat"
        )}
      </h3>
    </div>
  )
}
