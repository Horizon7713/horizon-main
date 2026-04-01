import { Badge } from "@/components/ui/badge"

interface Project {
  id: string
  name: string
  status: string
  budget: number
  current_budget: number
  start_date: string
  end_date: string
  users: string[]
}

interface ProjectsTableProps {
  projects: Project[]
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in-progress":
      case "in progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "planning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "on-hold":
      case "on hold":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No active projects found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Project Name</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Budget</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Team Size</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Start Date</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">End Date</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4 font-medium">{project.name}</td>
              <td className="py-3 px-4">
                <Badge variant="outline" className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </td>
              <td className="py-3 px-4">{formatCurrency(project.current_budget)}</td>
              <td className="py-3 px-4">{project.users?.length || 0}</td>
              <td className="py-3 px-4 text-muted-foreground">{formatDate(project.start_date)}</td>
              <td className="py-3 px-4 text-muted-foreground">{formatDate(project.end_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
