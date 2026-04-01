"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Table } from "./table"
import { ProjectTasks } from "./tasks"

type TabType = "tasks" | "receipts" | "timecards" | "media" | "users"

interface ProjectTabsProps {
  projectId: string
  initialTasks: ProjectTask[]
  projectType?: string
}

interface Task {
  id: string
  title: string
  description: string | null
  phase: string | null
  status: string
  due_date: string | null
  assigned_to: string | null
  sort_order: number
  created_at: string
  [key: string]: unknown
}

interface Receipt {
  id: string
  total_price: number
  created_at: string
  uploaded_by: string
  uploader?: {
    first_name: string
    last_name: string
  }
}

interface Timecard {
  id: string
  work_type: string
  notes: string | null
  created_at: string
  uploaded_by: string
  uploader?: {
    first_name: string
    last_name: string
  }
}

interface Media {
  id: string
  file_url: string
  mime_type: string
  caption: string | null
  created_at: string
  uploaded_by: string
  uploader?: {
    first_name: string
    last_name: string
  }
}

interface ProjectUser {
  id: string
  user_id: string
  role_in_project: string
  status: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

export function ProjectTabs({ projectId, initialTasks, projectType }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tasks")
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([])
  const [loading, setLoading] = useState(false)

  const tabs: { id: TabType; label: string }[] = [
    { id: "tasks", label: "Tasks" },
    { id: "receipts", label: "Receipts" },
    { id: "timecards", label: "Time Cards" },
    { id: "media", label: "Media" },
    { id: "users", label: "Users" },
  ]

  useEffect(() => {
    if (activeTab === "tasks") {
      fetchTasks()
    }
    if (activeTab === "receipts") {
      fetchReceipts()
    }
    if (activeTab === "timecards") {
      fetchTimecards()
    }
    if (activeTab === "media") {
      fetchMedia()
    }
    if (activeTab === "users") {
      fetchProjectUsers()
    }
  }, [activeTab, projectId])

  const fetchTasks = async () => {
    setLoading(true)
    // TODO: Replace with actual tasks table query when table exists
    // For now, show empty state
    setTasks([])
    setLoading(false)
  }

  const fetchReceipts = async () => {
    setLoading(true)
 

    const { data, error } = await supabase
      .from("receipts")
      .select(
        `
        id,
        total_price,
        created_at,
        uploaded_by,
        uploader:uploaded_by (
          first_name,
          last_name
        )
      `,
      )
      .eq("project", projectId)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setReceipts(data as Receipt[])
    }
    setLoading(false)
  }

  const fetchTimecards = async () => {
    setLoading(true)
 

    const { data, error } = await supabase
      .from("timecards")
      .select(
        `
        id,
        work_type,
        notes,
        created_at,
        uploaded_by,
        uploader:uploaded_by (
          first_name,
          last_name
        )
      `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setTimecards(data as Timecard[])
    }
    setLoading(false)
  }

  const fetchMedia = async () => {
    setLoading(true)
 

    const { data, error } = await supabase
      .from("media")
      .select(
        `
        id,
        file_url,
        mime_type,
        caption,
        created_at,
        uploaded_by,
        uploader:uploaded_by (
          first_name,
          last_name
        )
      `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setMedia(data as Media[])
    }
    setLoading(false)
  }

  const fetchProjectUsers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("project_users")
      .select(
        `
        id,
        user_id,
        role_in_project,
        status,
        created_at,
        user:user_id (
          first_name,
          last_name,
          email,
          role
        )
      `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setProjectUsers(data as ProjectUser[])
    }
    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const taskColumns = [
    {
      header: "Title",
      accessor: (row: Task) => row.title,
    },
    {
      header: "Status",
      accessor: (row: Task) => {
        const statusColors: Record<string, string> = {
          pending: "bg-yellow-100 text-yellow-800",
          in_progress: "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || "bg-gray-100 text-gray-800"}`}>
            {row.status.replace("_", " ")}
          </span>
        )
      },
    },
    {
      header: "Priority",
      accessor: (row: Task) => {
        const priorityColors: Record<string, string> = {
          low: "text-gray-600",
          medium: "text-yellow-600",
          high: "text-red-600",
        }
        return (
          <span className={`font-medium ${priorityColors[row.priority] || "text-gray-600"}`}>
            {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
          </span>
        )
      },
    },
    {
      header: "Assigned To",
      accessor: (row: Task) => {
        if (row.assignee) {
          return `${row.assignee.first_name} ${row.assignee.last_name}`
        }
        return "Unassigned"
      },
    },
    {
      header: "Due Date",
      accessor: (row: Task) => row.due_date ? formatDate(row.due_date) : "—",
    },
  ]

  const receiptColumns = [
    {
      header: "Uploaded By",
      accessor: (row: Receipt) => {
        if (row.uploader) {
          return `${row.uploader.first_name} ${row.uploader.last_name}`
        }
        return "Unknown"
      },
    },
    {
      header: "Total Price",
      accessor: (row: Receipt) => formatCurrency(row.total_price),
    },
    {
      header: "Date",
      accessor: (row: Receipt) => formatDate(row.created_at),
    },
  ]

  const timecardColumns = [
    {
      header: "Uploaded By",
      accessor: (row: Timecard) => {
        if (row.uploader) {
          return `${row.uploader.first_name} ${row.uploader.last_name}`
        }
        return "Unknown"
      },
    },
    {
      header: "Work Type",
      accessor: (row: Timecard) => row.work_type,
    },
    {
      header: "Notes",
      accessor: (row: Timecard) => row.notes || "—",
    },
    {
      header: "Date",
      accessor: (row: Timecard) => formatDate(row.created_at),
    },
  ]

  const mediaColumns = [
    {
      header: "File",
      accessor: (row: Media) => row.file_url?.split("/").pop() || "File",
    },
    {
      header: "Type",
      accessor: (row: Media) => row.mime_type?.split("/")[0] || "Unknown",
    },
    {
      header: "Uploaded By",
      accessor: (row: Media) => {
        if (row.uploader) {
          return `${row.uploader.first_name} ${row.uploader.last_name}`
        }
        return "Unknown"
      },
    },
    {
      header: "Date",
      accessor: (row: Media) => formatDate(row.created_at),
    },
  ]

  const userColumns = [
    {
      header: "Name",
      accessor: (row: ProjectUser) => {
        if (row.user) {
          return `${row.user.first_name} ${row.user.last_name}`
        }
        return "Unknown"
      },
    },
    {
      header: "Email",
      accessor: (row: ProjectUser) => row.user?.email || "—",
    },
    {
      header: "Role",
      accessor: (row: ProjectUser) => {
        const roleColors: Record<string, string> = {
          owner: "bg-purple-100 text-purple-800",
          admin: "bg-red-100 text-red-800",
          editor: "bg-blue-100 text-blue-800",
          viewer: "bg-gray-100 text-gray-800",
        }
        const role = row.role_in_project || row.user?.role || "viewer"
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || "bg-gray-100 text-gray-800"}`}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        )
      },
    },
    {
      header: "Status",
      accessor: (row: ProjectUser) => {
        const statusColors: Record<string, string> = {
          active: "bg-green-100 text-green-800",
          pending: "bg-yellow-100 text-yellow-800",
          inactive: "bg-gray-100 text-gray-800",
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || "bg-gray-100 text-gray-800"}`}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
        )
      },
    },
    {
      header: "Added",
      accessor: (row: ProjectUser) => formatDate(row.created_at),
    },
  ]

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === "tasks" && (
          <ProjectTasks projectId={projectId} projectType={projectType} />
        )}
        {activeTab === "receipts" && (
          <div>
            {loading ? (
              <p className="text-gray-600">Loading receipts...</p>
            ) : (
              <Table columns={receiptColumns} data={receipts} emptyMessage="No receipts found for this project" />
            )}
          </div>
        )}
        {activeTab === "timecards" && (
          <div>
            {loading ? (
              <p className="text-gray-600">Loading timecards...</p>
            ) : (
              <Table columns={timecardColumns} data={timecards} emptyMessage="No timecards found for this project" />
            )}
          </div>
        )}
        {activeTab === "media" && (
          <div>
            {loading ? (
              <p className="text-gray-600">Loading media...</p>
            ) : (
              <Table columns={mediaColumns} data={media} emptyMessage="No media found for this project" />
            )}
          </div>
        )}
        {activeTab === "users" && (
          <div>
            {loading ? (
              <p className="text-gray-600">Loading users...</p>
            ) : projectUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No users assigned to this project yet</p>
                <p className="text-gray-400 text-xs mt-1">Invite users to assign them to this project</p>
              </div>
            ) : (
              <Table columns={userColumns} data={projectUsers} emptyMessage="No users found for this project" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
