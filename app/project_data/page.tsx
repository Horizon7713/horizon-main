import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProjectsClient } from "@/components/projects-client"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { DeleteProjectButton } from "@/components/delete-project-button"
import { DEFAULT_PROJECT_TASKS } from "@/lib/default-project-tasks"

async function createProject(data: {
  name: string
  status: string
  startDate: string
  endDate: string
  users: string[]
  company: string
  budget?: number
  projectType: string
}) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get the user's profile ID
  const { data: profile } = await supabase.from("users").select("id").eq("auth_id", user.id).maybeSingle()

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
    // Fetch user roles to determine role_in_project
    const { data: assignedUsers } = await supabase.from("users").select("id, role").in("id", data.users)

    if (assignedUsers) {
      const projectUserEntries = assignedUsers.map((assignedUser) => ({
        project_id: newProject.id,
        user_id: assignedUser.id,
        role_in_project: assignedUser.role?.toLowerCase() || "member",
        status: "active",
        invited_by: profile.id,
        permissions: {},
      }))

      const { error: projectUsersError } = await supabase.from("project_users").insert(projectUserEntries)

      if (projectUsersError) {
        console.error("[v0] Error creating project_users entries:", projectUsersError)
        // Don't fail the whole operation, just log the error
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

  const { data: profile } = await supabase.from("users").select("role").eq("auth_id", user.id).maybeSingle()

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

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("users").select("role").eq("auth_id", user.id).maybeSingle()

  const isContractor = profile?.role?.toLowerCase() === "contractor"

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching projects:", error)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "completed":
        return "secondary"
      case "on-hold":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage and view all projects</p>
          </div>
          <div className="flex gap-2">
            <ProjectsClient createProject={createProject} />
            <form action="/api/auth/signout" method="POST">
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              {projects?.length || 0} project{projects?.length !== 1 ? "s" : ""} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!projects || projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No projects found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Budget</TableHead>
                    {isContractor && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          <Badge variant={getStatusVariant(project.status)}>{project.status || "Unknown"}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {project.company || "N/A"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {formatDate(project.start_date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {formatDate(project.end_date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {project.users?.length || 0} member{project.users?.length !== 1 ? "s" : ""}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/project_data/${project.id}`} className="block w-full">
                          {project.budget !== undefined ? `$${project.budget}` : "N/A"}
                        </Link>
                      </TableCell>
                      {isContractor && (
                        <TableCell className="text-right">
                          <DeleteProjectButton
                            projectId={project.id}
                            projectName={project.name}
                            deleteProject={deleteProject}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
