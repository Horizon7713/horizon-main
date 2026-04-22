"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Calendar,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Eye,
  Menu,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type NavigationItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permissionKey?: keyof RolePermissions
  restrictedRoles?: Array<"contractor" | "subcontractor">
  alwaysVisible?: boolean
}

const allNavigationItems: readonly NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permissionKey: "dashboard",
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    permissionKey: "messages",
  },
  {
    title: "Project Management",
    href: "/project_data",
    icon: FolderKanban,
    permissionKey: "project_management",
  },
  {
    title: "Plan Viewer",
    href: "/plan-viewer",
    icon: Eye,
    permissionKey: "plan_viewer",
    restrictedRoles: ["contractor", "subcontractor"],
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    alwaysVisible: true,
  },
] as const

type RolePermissions = {
  dashboard: boolean
  messages: boolean
  project_management: boolean
  plan_viewer?: boolean
  calendar?: boolean
}

const getPageName = (
  pathname: string,
  navigationItems: readonly {
    title: string
    href: string
  }[],
) => {
  const exactMatch = navigationItems.find((item) => item.href === pathname)
  if (exactMatch) return exactMatch.title

  const nestedMatch = navigationItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  )
  return nestedMatch?.title ?? "Workspace"
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [userRole, setUserRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .maybeSingle()

      if (!profile?.role) return

      setUserRole(profile.role)

      const { data: roleData } = await supabase
        .from("roles")
        .select("permissions")
        .eq("name", profile.role.toLowerCase())
        .maybeSingle()

      if (roleData?.permissions) {
        setRolePermissions(roleData.permissions as RolePermissions)
      } else {
        setRolePermissions({
          dashboard: false,
          messages: false,
          project_management: false,
          plan_viewer: false,
          calendar: true,
        })
      }
    }

    fetchUserRole()
  }, [])

  const navigationItems = useMemo(() => {
    return allNavigationItems.filter((item) => {
      if ("alwaysVisible" in item && item.alwaysVisible) return true
      if (!rolePermissions) return false
      if ("restrictedRoles" in item && item.restrictedRoles) {
        if (userRole !== "contractor" && userRole !== "subcontractor") return false
        return item.restrictedRoles.includes(userRole)
      }
      return rolePermissions[item.permissionKey as keyof RolePermissions] === true
    })
  }, [rolePermissions, userRole])

  const pageName = getPageName(pathname, navigationItems)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const NavItems = () => (
    <SidebarMenu className="gap-2">
      {navigationItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))

        const Icon = item.icon

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.title}
              className="
                group h-12 rounded-xl border border-transparent px-3
                text-[var(--text-soft)] transition-all duration-150
                hover:border-[var(--border-soft)] hover:bg-[var(--panel-2)] hover:text-white
                data-[active=true]:border-[rgba(245,158,11,0.32)]
                data-[active=true]:bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(217,119,6,0.06))]
                data-[active=true]:text-white
                data-[active=true]:shadow-[0_10px_24px_rgba(217,119,6,0.14)]
              "
            >
              <Link href={item.href} className="flex w-full items-center gap-3">
                <span
                  className="
                    flex size-9 items-center justify-center rounded-lg border
                    border-[var(--border)] bg-[rgba(255,255,255,0.02)]
                    transition-colors duration-150
                    group-hover:border-[var(--border-soft)]
                    group-data-[active=true]:border-[rgba(245,158,11,0.28)]
                    group-data-[active=true]:bg-[rgba(245,158,11,0.10)]
                    group-data-[collapsible=icon]:size-10
                  "
                >
                  <Icon className="size-4" />
                </span>

                <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium tracking-[-0.01em]">
                    {item.title}
                  </span>
                  {isActive ? (
                    <span className="app-badge-primary !px-2 !py-1 !text-[10px]">
                      Live
                    </span>
                  ) : null}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )

  return (
    <>
      <header className="app-topbar fixed inset-x-0 top-0 z-50 block md:hidden">
  <div className="border-b border-[var(--border)]">
    <div className="flex h-16 items-center justify-between gap-3 px-4">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
          <Image
            src="/images/design-mode/murphybuiltlogo.png"
            alt="Murphy Built"
            width={24}
            height={24}
            className="h-6 w-auto"
          />
        </div>

        <div className="min-w-0">
          <p className="app-section-header">Workspace</p>
          <p className="truncate text-sm font-semibold text-white">{pageName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <details className="relative z-[60]">
          <summary
            className="
              flex h-10 w-10 cursor-pointer list-none items-center justify-center
              rounded-xl border border-[var(--border)] bg-[var(--panel)]
              text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-white
            "
          >
            <Menu className="size-4" />
          </summary>

          <div
            className="
  absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl
  border border-[var(--border)] p-2
  shadow-[0_18px_50px_rgba(0,0,0,0.45)]
"
  style={{
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), transparent 48px), #161b22",
  }}
          >
            <div className="mb-2 px-2 pt-1">
              <p className="app-section-header">Navigation</p>
            </div>

            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive
                        ? "flex items-center rounded-xl border border-[rgba(245,158,11,0.32)] bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(217,119,6,0.06))] px-3 py-2 text-sm font-medium text-white"
                        : "flex items-center rounded-xl border border-transparent bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:border-[var(--border-soft)] hover:bg-[var(--panel-2)] hover:text-white"
                    }
                  >
                    {item.title}
                  </Link>
                )
              })}
            </div>

            <div className="mt-2 border-t border-[var(--border)] pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="
                  flex w-full items-center rounded-xl px-3 py-2 text-left text-sm
                  font-medium text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-white
                "
              >
                Sign out
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</header>

      <Sidebar
        collapsible="icon"
        className="
          hidden border-r border-[var(--border)] bg-[var(--background-elevated)] md:flex
        "
      >
        <SidebarHeader className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.015)]">
          <div className="flex items-center justify-between gap-2 px-3 py-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
                <Image
                  src="/images/design-mode/murphybuiltlogo.png"
                  alt="Murphy Built"
                  width={28}
                  height={28}
                  className="h-7 w-auto"
                />
              </div>

              <div className="min-w-0">
                <p className="app-section-header">Material Intelligence</p>
                <p className="truncate text-sm font-semibold text-white">Murphy Built</p>
              </div>
            </div>

            <SidebarTrigger
              className="
                rounded-xl border border-[var(--border)] bg-[var(--panel)]
                text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-white
              "
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="bg-transparent">
          <SidebarGroup className="px-2 py-3">
            <div className="px-2 pb-3 group-data-[collapsible=icon]:hidden">
              <p className="app-section-header">Navigation</p>
            </div>

            <SidebarGroupContent>
              <NavItems />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-[var(--border)] bg-[rgba(255,255,255,0.015)] p-3">
          <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-3 group-data-[collapsible=icon]:hidden">
            <p className="app-section-header">Current Module</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{pageName}</p>
            {userRole ? (
              <p className="mt-1 text-xs text-[var(--text-muted)] capitalize">
                {userRole}
              </p>
            ) : null}
          </div>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="
              h-12 w-full justify-start gap-3 rounded-xl border border-[var(--border)]
              bg-[var(--panel)] text-[var(--text-soft)]
              hover:bg-[var(--panel-2)] hover:text-white
            "
          >
            <LogOut className="size-4" />
            <span className="font-medium group-data-[collapsible=icon]:hidden">
              Sign out
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}