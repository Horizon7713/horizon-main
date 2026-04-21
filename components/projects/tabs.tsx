"use client"

import { useEffect, useState } from "react"
import {
  ClipboardList,
  Receipt,
  Clock3,
  ImageIcon,
  Users,
  ChevronRight,
} from "lucide-react"
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
  priority?: string
  assignee?: {
    first_name: string
    last_name: string
  } | null
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

function tabIcon(tab: TabType) {
  switch (tab) {
    case "tasks":
      return ClipboardList
    case "receipts":
      return Receipt
    case "timecards":
      return Clock3
    case "media":
      return ImageIcon
    case "users":
      return Users
    default:
      return ClipboardList
  }
}

function statusPill(value: string, kind: "task" | "userRole" | "userStatus") {
  const v = value?.toLowerCase?.() || ""

  if (kind === "task") {
    const classes: Record<string, string> = {
      pending: "border-amber-500/20 bg-amber-500/10 text-amber-200",
      in_progress: "border-blue-500/20 bg-blue-500/10 text-blue-200",
      completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      not_started: "border-zinc-700 bg-zinc-900 text-zinc-300",
    }
    return classes[v] || "border-zinc-700 bg-zinc-900 text-zinc-300"
  }

  if (kind === "userRole") {
    const classes: Record<string, string> = {
      owner: "border-purple-500/20 bg-purple-500/10 text-purple-200",
      admin: "border-red-500/20 bg-red-500/10 text-red-200",
      editor: "border-blue-500/20 bg-blue-500/10 text-blue-200",
      viewer: "border-zinc-700 bg-zinc-900 text-zinc-300",
      contractor: "border-blue-500/20 bg-blue-500/10 text-blue-200",
      subcontractor: "border-amber-500/20 bg-amber-500/10 text-amber-200",
      homeowner: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      employee: "border-zinc-700 bg-zinc-900 text-zinc-300",
      member: "border-zinc-700 bg-zinc-900 text-zinc-300",
    }
    return classes[v] || "border-zinc-700 bg-zinc-900 text-zinc-300"
  }

  const classes: Record<string, string> = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    inactive: "border-zinc-700 bg-zinc-900 text-zinc-300",
  }
  return classes[v] || "border-zinc-700 bg-zinc-900 text-zinc-300"
}

export function ProjectTabs({ projectId, initialTasks, projectType }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tasks")
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([])
  const [loading, setLoading] = useState(false)

  const tabs: { id: TabType; label: string; description: string }[] = [
    { id: "tasks", label: "Tasks", description: "Schedule, blockers, and workflow" },
    { id: "receipts", label: "Receipts", description: "Expense records and uploads" },
    { id: "timecards", label: "Time Cards", description: "Labor logs and notes" },
    { id: "media", label: "Media", description: "Photos, files, and attachments" },
    { id: "users", label: "Users", description: "People assigned to this project" },
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
      accessor: (row: Task) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusPill(
            row.status,
            "task",
          )}`}
        >
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Priority",
      accessor: (row: Task) => {
        const priorityColors: Record<string, string> = {
          low: "text-zinc-400",
          medium: "text-amber-300",
          high: "text-red-300",
        }
        return (
          <span className={`font-medium ${priorityColors[row.priority || ""] || "text-zinc-400"}`}>
            {row.priority
              ? row.priority.charAt(0).toUpperCase() + row.priority.slice(1)
              : "—"}
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
      accessor: (row: Task) => (row.due_date ? formatDate(row.due_date) : "—"),
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
        const role = row.role_in_project || row.user?.role || "viewer"
        return (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusPill(
              role,
              "userRole",
            )}`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        )
      },
    },
    {
      header: "Status",
      accessor: (row: ProjectUser) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusPill(
            row.status,
            "userStatus",
          )}`}
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      header: "Added",
      accessor: (row: ProjectUser) => formatDate(row.created_at),
    },
  ]

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab)
  const ActiveIcon = tabIcon(activeTab)

  return (
    <div className="w-full space-y-5">
      <div className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Project Workspace
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              Operations Workspace
            </h2>
            <p className="text-sm text-zinc-400">
              Switch between tasks, receipts, time cards, media, and project users.
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tabIcon(tab.id)

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                      : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-black px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <ActiveIcon className="h-4 w-4 text-zinc-300" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-zinc-100">
                    {activeTabMeta?.label}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {activeTabMeta?.description}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-zinc-800 bg-zinc-950">
        <div className="p-5">
          {activeTab === "tasks" && (
            <ProjectTasks projectId={projectId} projectType={projectType} />
          )}

          {activeTab === "receipts" && (
            <div>
              {loading ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-center text-sm text-zinc-500">
                  Loading receipts...
                </div>
              ) : (
                <Table
                  columns={receiptColumns}
                  data={receipts}
                  emptyMessage="No receipts found for this project"
                />
              )}
            </div>
          )}

          {activeTab === "timecards" && (
            <div>
              {loading ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-center text-sm text-zinc-500">
                  Loading time cards...
                </div>
              ) : (
                <Table
                  columns={timecardColumns}
                  data={timecards}
                  emptyMessage="No timecards found for this project"
                />
              )}
            </div>
          )}

          {activeTab === "media" && (
            <div>
              {loading ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-center text-sm text-zinc-500">
                  Loading media...
                </div>
              ) : (
                <Table
                  columns={mediaColumns}
                  data={media}
                  emptyMessage="No media found for this project"
                />
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div>
              {loading ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-center text-sm text-zinc-500">
                  Loading users...
                </div>
              ) : projectUsers.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-12 text-center">
                  <p className="text-sm font-medium text-zinc-200">
                    No users assigned to this project yet
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Invite users to assign them to this project
                  </p>
                </div>
              ) : (
                <Table
                  columns={userColumns}
                  data={projectUsers}
                  emptyMessage="No users found for this project"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
