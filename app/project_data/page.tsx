import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProjectsClient } from "@/components/projects-client"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { DeleteProjectButton } from "@/components/delete-project-button"
import { DEFAULT_PROJECT_TASKS } from "@/lib/default-project-tasks"
import {
  Building2,
  CalendarDays,
  DollarSign,
  FolderKanban,
  Users,
  ChevronRight,
} from "lucide-react"

async function createProject(data: {
  name: string
  status: string
  startDate: string
  endDate: string
  users: string[]
  company: string
  budget?: number
  projectType: string
  squareFeet?: number
  bathroomCount?: number
  windowCount?: number
  doorCount?: number
  cabinetCount?: number
}) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: "User profile not found" }
  }

  const { data: newProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: data.name,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      users: data.users,
      company: data.company,
      budget: data.budget,
      contractor_user_id: profile.id,
      current_budget: data.budget,
      project_type: data.projectType,
      square_feet: data.squareFeet ?? null,
      bathroom_count: data.bathroomCount ?? null,
      window_count: data.windowCount ?? null,
      door_count: data.doorCount ?? null,
      cabinet_count: data.cabinetCount ?? null,
    })
    .select()
    .single()

  if (newProject) {
    const taskRows = DEFAULT_PROJECT_TASKS.map((task) => ({
      project_id: newProject.id,
      created_by: profile.id,
      name: task.name,
      phase: task.phase,
      sort_order: task.sort_order,
      status: "not_started",
      is_ai_generated: false,
    }))

    const { error: tasksError } = await supabase
      .from("project_tasks")
      .insert(taskRows)

    if (tasksError) {
      console.error("[v0] Error creating default project tasks:", tasksError)
    }
  }

  if (projectError) {
    console.error("[v0] Error creating project:", projectError)
    return { success: false, error: projectError.message }
  }

  if (data.users.length > 0 && newProject) {
    const { data: assignedUsers } = await supabase
      .from("users")
      .select("id, role")
      .in("id", data.users)

    if (assignedUsers) {
      const projectUserEntries = assignedUsers.map((assignedUser) => ({
        project_id: newProject.id,
        user_id: assignedUser.id,
        role_in_project: assignedUser.role?.toLowerCase() || "member",
        status: "active",
        invited_by: profile.id,
        permissions: {},
      }))

      const { error: projectUsersError } = await supabase
        .from("project_users")
        .insert(projectUserEntries)

      if (projectUsersError) {
        console.error("[v0] Error creating project_users entries:", projectUsersError)
      }
    }
  }

  revalidatePath("/project_data")
  revalidatePath("/dashboard")
  return { success: true }
}

async function deleteProject(projectId: string) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (profile?.role?.toLowerCase() !== "contractor") {
    return { success: false, error: "Only contractors can delete projects" }
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId)

  if (error) {
    console.error("[v0] Error deleting project:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/project_data")
  return { success: true }
}

function HeaderAction({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100"
          : "rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
      }
    >
      {label}
    </button>
  )
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
}: {
  label: string
  value: string
  meta: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 h-px bg-zinc-700" />
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-zinc-50">
            {value}
          </div>
          <div className="mt-2 text-xs text-zinc-400">{meta}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-black">
          <Icon className="h-5 w-5 text-zinc-200" />
        </div>
      </div>
    </div>
  )
}

function SurfacePanel({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-1 text-lg font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  )
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusPill(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    case "completed":
      return "border-blue-500/20 bg-blue-500/10 text-blue-200"
    case "on-hold":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .maybeSingle()

  const isContractor = profile?.role?.toLowerCase() === "contractor"

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching projects:", error)
  }

  const projectCount = projects?.length || 0
  const activeCount = projects?.filter((p) => p.status?.toLowerCase() === "active").length || 0
  const totalBudget =
    projects?.reduce((sum, p) => sum + (typeof p.budget === "number" ? p.budget : 0), 0) || 0

  return (
    <div className="min-h-full bg-black text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Enterprise Workspace
            </div>
            <div className="mt-1 text-lg font-semibold text-zinc-100">
              Project Management
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HeaderAction label="Overview" active />
            <HeaderAction label="Projects" />
            <HeaderAction label="Operations" />
            <HeaderAction label="Assignments" />
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-5">
          <SurfacePanel
            eyebrow="Projects Workspace"
            title="Construction Project Controls"
            subtitle="Manage active jobs, scheduling windows, budgets, and team assignments."
            actions={
              <div className="flex items-center gap-2">
                <ProjectsClient createProject={createProject} />
                <form action="/api/auth/signout" method="POST">
                  <Button
                    variant="outline"
                    type="submit"
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    Sign out
                  </Button>
                </form>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Projects"
                value={projectCount.toString()}
                meta="Tracked in this workspace"
                icon={FolderKanban}
              />
              <MetricCard
                label="Active Jobs"
                value={activeCount.toString()}
                meta="Currently in delivery"
                icon={Building2}
              />
              <MetricCard
                label="Budget Volume"
                value={`$${totalBudget.toLocaleString()}`}
                meta="Combined project budget"
                icon={DollarSign}
              />
              <MetricCard
                label="Avg Team Size"
                value={
                  projectCount > 0
                    ? Math.round(
                        (projects?.reduce((sum, p) => sum + (p.users?.length || 0), 0) || 0) /
                          projectCount,
                      ).toString()
                    : "0"
                }
                meta="Assigned members per project"
                icon={Users}
              />
            </div>
          </SurfacePanel>

          <SurfacePanel
            eyebrow="Project Directory"
            title="All Projects"
            subtitle={`${projectCount} project${projectCount !== 1 ? "s" : ""} total`}
          >
            {!projects || projects.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-12 text-center">
                <p className="text-sm font-medium text-zinc-200">No projects found</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Create a project to start managing schedules, budgets, and assignments.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Start
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          End
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Team
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Budget
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          {isContractor ? "Actions" : "Open"}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {projects.map((project) => (
                        <tr
                          key={project.id}
                          className="border-b border-zinc-800/80 bg-black transition-colors hover:bg-zinc-950"
                        >
                          <td className="px-4 py-4">
                            <Link href={`/project_data/${project.id}`} className="block">
                              <div className="text-sm font-medium text-zinc-100">
                                {project.name}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {project.project_type || "General project"}
                              </div>
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link href={`/project_data/${project.id}`} className="block">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusPill(project.status || "Unknown")}`}
                              >
                                {project.status || "Unknown"}
                              </span>
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/project_data/${project.id}`}
                              className="block text-sm text-zinc-300"
                            >
                              {project.company || "N/A"}
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/project_data/${project.id}`}
                              className="inline-flex items-center gap-2 text-sm text-zinc-300"
                            >
                              <CalendarDays className="h-4 w-4 text-zinc-500" />
                              {formatDate(project.start_date)}
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/project_data/${project.id}`}
                              className="inline-flex items-center gap-2 text-sm text-zinc-300"
                            >
                              <CalendarDays className="h-4 w-4 text-zinc-500" />
                              {formatDate(project.end_date)}
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/project_data/${project.id}`}
                              className="inline-flex items-center gap-2 text-sm text-zinc-300"
                            >
                              <Users className="h-4 w-4 text-zinc-500" />
                              {project.users?.length || 0} member
                              {project.users?.length !== 1 ? "s" : ""}
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/project_data/${project.id}`}
                              className="inline-flex items-center gap-2 text-sm text-zinc-300"
                            >
                              <DollarSign className="h-4 w-4 text-zinc-500" />
                              {project.budget !== undefined && project.budget !== null
                                ? `$${Number(project.budget).toLocaleString()}`
                                : "N/A"}
                            </Link>
                          </td>

                          <td className="px-4 py-4 text-right">
                            {isContractor ? (
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/project_data/${project.id}`}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                                >
                                  Open
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                                <DeleteProjectButton
                                  projectId={project.id}
                                  projectName={project.name}
                                  deleteProject={deleteProject}
                                />
                              </div>
                            ) : (
                              <Link
                                href={`/project_data/${project.id}`}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                              >
                                Open
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SurfacePanel>
        </div>
      </div>
    </div>
  )
}
