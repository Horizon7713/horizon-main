import { cn } from "@/lib/utils"

type AvatarSize = "sm" | "md" | "lg"
type AvatarColor = "blue" | "red" | "green" | "purple" | "pink"

interface AvatarProps {
  firstName: string | null
  lastName: string | null
  size?: AvatarSize
  className?: string
  role?: string | null
  avatarColor?: AvatarColor | null
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

const colorClasses: Record<AvatarColor, string> = {
  blue: "bg-blue-950/50 text-blue-300 border border-blue-800/30",
  red: "bg-red-950/50 text-red-300 border border-red-800/30",
  green: "bg-green-950/50 text-green-300 border border-green-800/30",
  purple: "bg-purple-950/50 text-purple-300 border border-purple-800/30",
  pink: "bg-pink-950/50 text-pink-300 border border-pink-800/30",
}

export function Avatar({ firstName, lastName, size = "md", className, role, avatarColor }: AvatarProps) {
  const getInitials = () => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  const getRoleEmoji = () => {
    if (!role) return null
    const normalizedRole = role.toLowerCase()
    switch (normalizedRole) {
      case "contractor":
        return "🏗️"
      case "subcontractor":
        return "🧰"
      case "homeowner":
        return "🏠"
      case "employee":
        return "🛠️"
      default:
        return null
    }
  }

  const roleEmoji = getRoleEmoji()
  const colorClass = avatarColor ? colorClasses[avatarColor] : colorClasses.blue

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          sizeClasses[size],
          colorClass,
          className,
        )}
      >
        {getInitials()}
      </div>
      {roleEmoji && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 bg-card border border-border rounded-full flex items-center justify-center",
            "text-[10px] p-[0.15rem]",
          )}
        >
          {roleEmoji}
        </div>
      )}
    </div>
  )
}
