import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ProjectHeader } from "@/components/projects/header"
import { ProjectTabs } from "@/components/projects/tabs"

interface ProjectTask {
  id: string
  title: string
  description: string | null
  phase: string | null
  status: string
  project_type: string | null
  due_date: string | null
  assigned_to: string | null
  sort_order: number
  created_at: string
  [key: string]: unknown
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: project, error } = await supabase.from("projects").select("*").eq("id", slug).single()

  if (error || !project) {
    notFound()
  }

  const memberCount = project.users?.length || 0

  const { data: receipts } = await supabase.from("receipts").select("total_price").eq("project", slug)

  const totalSpent = receipts?.reduce((sum, receipt) => sum + (receipt.total_price || 0), 0) || 0

  const remainingBudget = project.budget !== null ? project.budget - totalSpent : null

  // Fetch project tasks ordered by sort_order
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", slug)
    .order("sort_order", { ascending: true })

  return (
    <div className="min-h-screen bg-background p-8">
      <ProjectHeader
        name={project.name}
        startDate={project.start_date}
        endDate={project.end_date}
        memberCount={memberCount}
        budget={project.budget}
        remainingBudget={remainingBudget}
      />
      <div className="mt-6">
        <ProjectTabs
  projectId={slug}
  initialTasks={(tasks as ProjectTask[]) || []}
  projectType={project?.project_type || "new_construction"}
/> 
      </div>
    </div>
  )
}
