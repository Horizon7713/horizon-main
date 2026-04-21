"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

type CaptureProcessingStatusProps = {
  projectId: string
}

type ProcessingJob = {
  id: string
  status: "queued" | "running" | "completed" | "failed"
  detected_stage?: string | null
  confidence?: number | null
  summary?: string | null
  error_message?: string | null
  completed_at?: string | null
  created_at: string
}

export function CaptureProcessingStatus({
  projectId,
}: CaptureProcessingStatusProps) {
  const [job, setJob] = useState<ProcessingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("project_capture_processing_jobs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (!isMounted) return

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setJob((data?.[0] as ProcessingJob) || null)
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel(`capture-processing-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_capture_processing_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void load()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      void supabase.removeChannel(channel)
    }
  }, [projectId])

  return (
    <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Capture Intelligence
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">
          Latest Processing Result
        </div>
        <div className="mt-1 text-sm text-zinc-400">
          Shows what the system inferred from the most recent site capture session.
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            Loading processing status...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : !job ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            No processing jobs yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Status
                </div>
                <div className="mt-2 text-sm font-medium capitalize text-zinc-100">
                  {job.status}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Detected Stage
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-100">
                  {job.detected_stage || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Confidence
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-100">
                  {typeof job.confidence === "number"
                    ? `${Math.round(job.confidence * 100)}%`
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Completed
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-100">
                  {job.completed_at
                    ? new Date(job.completed_at).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>

            {job.summary ? (
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Summary
                </div>
                <div className="mt-2 text-sm text-zinc-300">{job.summary}</div>
              </div>
            ) : null}

            {job.error_message ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {job.error_message}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}