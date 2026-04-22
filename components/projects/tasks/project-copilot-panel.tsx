"use client"

import { useEffect, useState } from "react"
import { Bot, ClipboardList, ShieldAlert, Sparkles } from "lucide-react"

import { getProjectCopilotRecap } from "@/app/project_data/actions"
import { Button } from "@/components/ui/button"
import { ProjectCopilotRecap } from "./task-types"

interface ProjectCopilotPanelProps {
  projectId: string
}

function PanelBlock({
  icon: Icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tone?: "neutral" | "info" | "danger" | "success"
  children: React.ReactNode
}) {
  const toneClass =
    tone === "info"
      ? "border-blue-500/20 bg-blue-500/10"
      : tone === "danger"
        ? "border-red-500/20 bg-red-500/10"
        : tone === "success"
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-zinc-800 bg-black"

  const iconClass =
    tone === "info"
      ? "text-blue-200"
      : tone === "danger"
        ? "text-red-200"
        : tone === "success"
          ? "text-emerald-200"
          : "text-zinc-300"

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

export function ProjectCopilotPanel({ projectId }: ProjectCopilotPanelProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [recap, setRecap] = useState<ProjectCopilotRecap | null>(null)

  async function loadRecap(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    setMessage(null)

    try {
      const result = await getProjectCopilotRecap(projectId)

      if (!result.success || !result.data) {
  setMessage("Failed to load project recap.")
  setRecap(null)
} else {
  setRecap(result.data as ProjectCopilotRecap)
}
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load project recap."
      setMessage(msg)
      setRecap(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadRecap()
  }, [projectId])

  function pushHomeownerUpdateToDraft() {
    if (!recap?.homeowner_update) return

    window.dispatchEvent(
      new CustomEvent("use-copilot-homeowner-update", {
        detail: {
          title: "Project weekly update",
          type: "progress",
          internal_summary: recap.summary,
          homeowner_summary: recap.homeowner_update,
          requires_homeowner_action: false,
        },
      }),
    )
  }

  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <Bot className="h-5 w-5 text-blue-300" />
            <span>PM Copilot</span>
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            AI recap of project status, current risks, and suggested next steps.
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            onClick={() => void loadRecap(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Recap"}
          </Button>

          <Button
            type="button"
            className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
            onClick={pushHomeownerUpdateToDraft}
            disabled={!recap?.homeowner_update}
          >
            Use Homeowner Update
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-sm text-zinc-500">
          Loading project recap...
        </div>
      ) : message ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {message}
        </div>
      ) : !recap ? (
        <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-sm text-zinc-500">
          No recap available.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <PanelBlock icon={Sparkles} title="Summary" tone="info">
            <div className="text-sm leading-6 text-zinc-200">{recap.summary}</div>
          </PanelBlock>

          <PanelBlock icon={ShieldAlert} title="Risks" tone="danger">
            {recap.risks.length === 0 ? (
              <div className="text-sm text-zinc-500">No major risks flagged.</div>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-200">
                {recap.risks.map((risk, index) => (
                  <li
                    key={`${risk}-${index}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                  >
                    {risk}
                  </li>
                ))}
              </ul>
            )}
          </PanelBlock>

          <PanelBlock icon={ClipboardList} title="Next Actions" tone="success">
            {recap.next_actions.length === 0 ? (
              <div className="text-sm text-zinc-500">No next actions suggested.</div>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-200">
                {recap.next_actions.map((action, index) => (
                  <li
                    key={`${action}-${index}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </PanelBlock>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 xl:col-span-3">
            <div className="mb-2 text-sm font-semibold text-zinc-100">
              Homeowner Update Preview
            </div>
            <div className="text-sm leading-6 text-zinc-200">
              {recap.homeowner_update}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}