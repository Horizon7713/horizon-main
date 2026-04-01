"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, MessageSquare, FolderKanban, LogOut, Menu, Eye, Calendar } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

const allNavigationItems = [
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
]

const getPageName = (pathname: string, navigationItems: typeof allNavigationItems) => {
  const item = navigationItems.find((item) => item.href === pathname)
  return item ? item.title : "Dashboard"
}

type RolePermissions = {
  dashboard: boolean
  messages: boolean
  project_management: boolean
  plan_viewer?: boolean
  calendar?: boolean
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null)

  const navigationItems = allNavigationItems.filter((item) => {
    // Always show items with alwaysVisible flag
    if ('alwaysVisible' in item && item.alwaysVisible) {
      return true
    }
    if (!rolePermissions) return false
    // Check if item has role restrictions
    if (item.restrictedRoles) {
      return item.restrictedRoles.includes(userRole || "")
    }
    return rolePermissions[item.permissionKey as keyof RolePermissions] === true
  })

  const pageName = getPageName(pathname, navigationItems)

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Currently logged in user ID:", user?.id)

      if (user?.id) {
        const { data: profile, error } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", user.id)
          .maybeSingle()

        if (profile) {
          setUserRole(profile.role)

          const { data: roleData, error: roleError } = await supabase
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
            })
          }
        }
      }
    }

    fetchUserRole()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      <header className="block md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="border-b border-border px-6 py-4">
                  <Image
                    src="/images/design-mode/murphybuiltlogo.png"
                    alt="Murphy Built"
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>

                <nav className="flex-1 px-3 py-4">
                  <div className="space-y-1">
                    {navigationItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-3">
                            <item.icon className="size-5" />
                            <span>{item.title}</span>
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                </nav>

                <div className="border-t border-border p-3">
                  <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start gap-3">
                    <LogOut className="size-5" />
                    <span>Sign out</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-lg">
            <Image
              src="/images/design-mode/murphybuiltlogo.png"
              alt="Murphy Built"
              width={100}
              height={28}
              className="h-7 w-auto"
            />
            <span className="font-light">| {pageName}</span>
          </div>
        </div>
      </header>

      <Sidebar collapsible="icon" className="hidden md:flex">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
            <Image
              src="/images/design-mode/murphybuiltlogo.png"
              alt="Murphy Built"
              width={120}
              height={32}
              className="h-8 w-auto group-data-[collapsible=icon]:hidden"
            />
            <SidebarTrigger />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
