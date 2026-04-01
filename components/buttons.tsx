import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary"
  size?: "sm" | "md" | "lg"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"

    const variantStyles = {
      primary:
        "bg-gradient-to-br from-[#dcc896] to-[#604506] text-background hover:shadow-lg hover:shadow-[#dcc896]/20 hover:scale-[1.02] active:scale-[0.98]",
      secondary:
        "border-2 border-[#dcc896] text-[#dcc896] hover:bg-[#dcc896]/10 hover:shadow-md hover:shadow-[#dcc896]/10 active:scale-[0.98]",
      tertiary: "text-[#dcc896] hover:bg-[#dcc896]/5 hover:text-[#dcc896] active:scale-[0.98]",
    }

    const sizeStyles = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-13 px-8 text-lg",
    }

    return (
      <button ref={ref} className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
        {children}
      </button>
    )
  },
)

Button.displayName = "Button"

export { Button }
export type { ButtonProps }
