import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard, TableCard } from "@/components/cards"
import { ProjectsTable } from "@/components/table"
import {
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Hammer,
  Mouse as House,
  MessageSquare,
  Receipt,
  Clock,
  ImageIcon,
  Paperclip,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Fetch user profile data
  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", user.id).single()

  if (profile?.role === "employee") {
    // Employees don't have dashboard access, redirect to messages
    redirect("/messages")
  }

  let activeProjectsCount = 0
  let userProjects: any[] = []
  if (profile?.id) {
    const userRole = profile.role?.toLowerCase()

    if (userRole === "contractor" || userRole === "subcontractor") {
      // Contractors and subcontractors see projects they own
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("contractor_user_id", profile.id)
        .order("created_at", { ascending: false })

      if (!error && projects) {
        activeProjectsCount = projects.length
        userProjects = projects
      }
    } else if (userRole === "homeowner") {
      // Homeowners see projects they're assigned to via project_users table
      const { data: projectAssignments, error } = await supabase
        .from("project_users")
        .select("project_id, projects(*)")
        .eq("user_id", profile.id)
        .eq("status", "active")

      if (!error && projectAssignments) {
        // Extract the project data from the joined query
        userProjects = projectAssignments
          .map((assignment: any) => assignment.projects)
          .filter((project: any) => project !== null)
        activeProjectsCount = userProjects.length
      }
    }
  }

  let teamMembersCount = 0
  if (profile?.id) {
    const userRole = profile.role?.toLowerCase()

    if (userRole === "contractor") {
      // Contractors see their employees
      const { data: contractor, error } = await supabase
        .from("contractors")
        .select("employees")
        .eq("contractor_user_id", profile.id)
        .maybeSingle()

      if (!error && contractor?.employees) {
        // Count the number of employees in the jsonb array
        if (Array.isArray(contractor.employees)) {
          if (contractor.employees.length === 1 && typeof contractor.employees[0] === "string") {
            // Check if the single element contains comma-separated UUIDs
            const employeeString = contractor.employees[0]
            if (employeeString.includes(",")) {
              // Split by comma and count
              teamMembersCount = employeeString
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id.length > 0).length
            } else {
              teamMembersCount = 1
            }
          } else {
            teamMembersCount = contractor.employees.length
          }
        }
      }
    } else if (userRole === "homeowner") {
      // Homeowners see team members assigned to their projects
      const projectIds = userProjects.map((p) => p.id)
      if (projectIds.length > 0) {
        const { data: projectUsers, error } = await supabase
          .from("project_users")
          .select("user_id")
          .in("project_id", projectIds)
          .eq("status", "active")

        if (!error && projectUsers) {
          // Count unique users across all their projects
          const uniqueUsers = new Set(projectUsers.map((pu: any) => pu.user_id))
          teamMembersCount = uniqueUsers.size
        }
      }
    }
  }

  const userRole = profile?.role?.toLowerCase()

  let recentMessages: any[] = []
  if (userRole === "homeowner" && profile?.id) {
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        type,
        file_url,
        mime_type,
        users(first_name, last_name, email)
      `)
      .eq("receiver_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (!error && messages) {
      recentMessages = messages
    }
  }

  const stats =
    userRole === "homeowner"
      ? [
          {
            title: "Your Project",
            value: userProjects.length > 0 ? userProjects[0].name : "No project assigned",
            icon: House,
            change: userProjects.length > 0 ? "Active" : "Awaiting assignment",
            trend: "neutral" as const,
          },
          {
            title: "Team Members",
            value: teamMembersCount.toString(),
            icon: Users,
            change: "Working on your project",
            trend: "neutral" as const,
          },
        ]
      : [
          {
            title: "Active Projects",
            value: activeProjectsCount.toString(),
            icon: Building2,
            change: "+2 this month",
            trend: "up" as const,
          },
          {
            title: "Team Members",
            value: teamMembersCount.toString(),
            icon: Users,
            change: "3 new hires",
            trend: "up" as const,
          },
          {
            title: "Money Made",
            value: "$1.8M",
            icon: DollarSign,
            change: "+22% from last month",
            trend: "up" as const,
          },
        ]

  const activities = [
    {
      id: 1,
      type: "milestone",
      project: "Downtown Office Complex",
      message: "Foundation completed ahead of schedule",
      time: "2 hours ago",
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      id: 2,
      type: "alert",
      project: "Highway Bridge Repair",
      message: "Material delivery delayed by 3 days",
      time: "5 hours ago",
      icon: AlertCircle,
      color: "text-amber-500",
    },
    {
      id: 3,
      type: "update",
      project: "School Renovation",
      message: "Electrical work 90% complete",
      time: "1 day ago",
      icon: Hammer,
      color: "text-blue-500",
    },
    {
      id: 4,
      type: "milestone",
      project: "Riverside Residential",
      message: "Framing inspection passed",
      time: "2 days ago",
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      id: 5,
      type: "update",
      project: "Downtown Office Complex",
      message: "New team member assigned",
      time: "3 days ago",
      icon: Users,
      color: "text-blue-500",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="">
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {profile?.first_name || user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                change={stat.change}
                trend={stat.trend}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TableCard title="Active Projects" description="Track progress and manage your construction projects">
                <ProjectsTable projects={userProjects} />
              </TableCard>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    {userRole === "homeowner" ? "Latest messages from your team" : "Latest updates from your projects"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userRole === "homeowner" ? (
                      recentMessages.length > 0 ? (
                        recentMessages.map((message) => {
                          const sender = message.users
                          const senderName =
                            sender?.first_name && sender?.last_name
                              ? `${sender.first_name} ${sender.last_name}`
                              : sender?.email || "Unknown"
                          const contentPreview =
                            message.content?.length > 60
                              ? `${message.content.substring(0, 60)}...`
                              : message.content || "No content"
                          const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

                          let Icon = MessageSquare
                          let iconColor = "text-blue-500"
                          let typeLabel = "Message"

                          if (message.type === "receipt") {
                            Icon = Receipt
                            iconColor = "text-green-500"
                            typeLabel = "Receipt"
                          } else if (message.type === "timecard") {
                            Icon = Clock
                            iconColor = "text-purple-500"
                            typeLabel = "Timecard"
                          } else if (message.type === "media") {
                            Icon = ImageIcon
                            iconColor = "text-orange-500"
                            typeLabel = "Media"
                          } else if (message.file_url) {
                            Icon = Paperclip
                            iconColor = "text-gray-500"
                            typeLabel = "File"
                          }

                          const hasImage = message.file_url && message.mime_type?.startsWith("image/")

                          return (
                            <div key={message.id} className="flex gap-3">
                              <div className={`mt-0.5 ${iconColor}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium leading-none">{senderName}</p>
                                  <span className="text-xs text-muted-foreground">• {typeLabel}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">{contentPreview}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                  </div>
                                  {hasImage && (
                                    <img
                                      src={message.file_url || "/placeholder.svg"}
                                      alt="Message attachment"
                                      className="rounded border w-12 h-12 object-cover flex-shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No messages yet</p>
                        </div>
                      )
                    ) : (
                      activities.map((activity) => {
                        const Icon = activity.icon
                        return (
                          <div key={activity.id} className="flex gap-3">
                            <div className={`mt-0.5 ${activity.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">{activity.project}</p>
                              <p className="text-sm text-muted-foreground">{activity.message}</p>
                              <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
