import { useCallback, useEffect, useState } from "react"

import {
  deleteTask,
  generateBaselineTasks,
  insertGeneratedTasks,
  updateTaskStatus,
} from "@/app/project_data/actions"
import { supabase } from "@/lib/supabase/client"

import { Task, TaskStatus } from "./task-types"

interface GeneratedTaskPreview {
  name: string
  phase: string
  sort_order: number
  description?: string | null
  depends_on_names?: string[]
}

interface UseProjectTasksOptions {
  projectId: string
  projectType?: string
}

export function useProjectTasks({ projectId, projectType }: UseProjectTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTaskPreview[]>([])
  const [generating, setGenerating] = useState(false)
  const [insertingGenerated, setInsertingGenerated] = useState(false)
  const [generateMessage, setGenerateMessage] = useState("")
  const [projectNotes, setProjectNotes] = useState("")

  const fetchTasks = useCallback(async () => {
    setError(null)

    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setTasks((data as Task[]) || [])
  }, [projectId])

  useEffect(() => {
    fetchTasks().finally(() => setLoading(false))
  }, [fetchTasks])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTask(id)
      await fetchTasks()
    },
    [fetchTasks]
  )

  const handleStatusUpdate = useCallback(
    async (id: string, status: TaskStatus) => {
      await updateTaskStatus(id, status)
      await fetchTasks()
    },
    [fetchTasks]
  )

  const handleGenerateTasks = useCallback(async () => {
    try {
      setGenerating(true)
      setGenerateMessage("")

      const generated = await generateBaselineTasks(projectNotes, projectType)
      setGeneratedTasks(generated || [])

      if ((generated || []).length > 0) {
        setGenerateMessage(`${generated.length} tasks generated.`)
      } else {
        setGenerateMessage("No tasks were generated.")
      }
    } finally {
      setGenerating(false)
    }
  }, [projectNotes, projectType])

  const handleInsertGeneratedTasks = useCallback(async () => {
    if (generatedTasks.length === 0) return

    try {
      setInsertingGenerated(true)
      setGenerateMessage("")

      const result = await insertGeneratedTasks(projectId, generatedTasks)

      await fetchTasks()

      if (result.inserted === 0) {
        setGenerateMessage("All generated tasks already exist for this project.")
      } else {
        setGenerateMessage(`${result.inserted} tasks inserted.`)
      }

      setGeneratedTasks([])
    } finally {
      setInsertingGenerated(false)
    }
  }, [fetchTasks, generatedTasks, projectId])

  return {
    tasks,
    setTasks,
    loading,
    error,
    fetchTasks,

    generatedTasks,
    setGeneratedTasks,
    generating,
    insertingGenerated,
    generateMessage,
    setGenerateMessage,
    projectNotes,
    setProjectNotes,

    handleDelete,
    handleStatusUpdate,
    handleGenerateTasks,
    handleInsertGeneratedTasks,
  }
}