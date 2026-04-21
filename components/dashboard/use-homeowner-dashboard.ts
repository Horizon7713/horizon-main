"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  ProjectUpdate,
  Task,
} from "@/components/projects/tasks/task-types"
import {
  HomeownerDashboardData,
  buildHomeownerDashboardData,
  deriveVisualStageFromTasks,
} from "./homeowner-dashboard-utils"

export function useHomeownerDashboard(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId) return

    setRefreshing(true)
    setError(null)

    try {
      const [tasksRes, updatesRes] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true }),

        supabase
          .from("project_updates")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_published", true)
          .order("published_at", { ascending: false }),
      ])

      if (tasksRes.error) {
        setError(tasksRes.error.message)
        return
      }

      if (updatesRes.error) {
        setError(updatesRes.error.message)
        return
      }

      setTasks((tasksRes.data as Task[]) || [])
      setUpdates((updatesRes.data as ProjectUpdate[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.")
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dashboardData: HomeownerDashboardData = useMemo(() => {
    const baseData = buildHomeownerDashboardData(tasks, updates)
    const currentVisualStage = deriveVisualStageFromTasks(tasks)

    return {
      ...baseData,
      currentVisualStage,
    }
  }, [tasks, updates])

  return {
    loading,
    refreshing,
    error,
    refresh,
    tasks,
    updates,
    dashboardData,
  }
}