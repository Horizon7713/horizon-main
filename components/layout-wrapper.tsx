"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar"

const AUTH_ROUTES = new Set(["/", "/signup"])
const FULLSCREEN_WORKSPACE_ROUTES = new Set(["/plan-viewer"])

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const hideSidebar = AUTH_ROUTES.has(pathname)
  const isFullscreenWorkspace = FULLSCREEN_WORKSPACE_ROUTES.has(pathname)

  if (hideSidebar) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
        {children}
      </div>
    )
  }

  if (isFullscreenWorkspace) {
    return (
      <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--text)]">
        {children}
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-[var(--background)] text-[var(--text)]">
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="bg-transparent">
            <div className="min-h-screen bg-transparent">
              <div className="app-page">
                <div className="app-page-inner">{children}</div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}