"use client"

import { useEffect, useState } from "react"

import {
  createProjectUpdate,
  deleteProjectUpdate,
  draftProjectUpdateFromTasks,
  getProjectUpdates,
  getProjectUpdateSuggestions,
  updateProjectUpdate,
} from "@/app/project_data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ProjectUpdate,
  ProjectUpdateSuggestion,
  PROJECT_UPDATE_TYPE_OPTIONS,
} from "./task-types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProjectUpdatesPanelProps {
  projectId: string
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  )
}

export function ProjectUpdatesPanel({ projectId }: ProjectUpdatesPanelProps) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [suggestions, setSuggestions] = useState<ProjectUpdateSuggestion[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [type, setType] = useState<ProjectUpdate["type"]>("progress")
  const [internalSummary, setInternalSummary] = useState("")
  const [homeownerSummary, setHomeownerSummary] = useState("")
  const [requiresHomeownerAction, setRequiresHomeownerAction] = useState(false)
  const [draftSourceType, setDraftSourceType] = useState<"manual" | "ai_generated">("manual")

  useEffect(() => {
    function handleUseCopilotHomeownerUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        title: string
        type: ProjectUpdate["type"]
        internal_summary: string
        homeowner_summary: string
        requires_homeowner_action: boolean
      }>

      const detail = customEvent.detail
      if (!detail) return

      setTitle(detail.title)
      setType(detail.type)
      setInternalSummary(detail.internal_summary)
      setHomeownerSummary(detail.homeowner_summary)
      setRequiresHomeownerAction(detail.requires_homeowner_action)
      setDraftSourceType("manual")
      setMessage(null)
    }

    window.addEventListener(
      "use-copilot-homeowner-update",
      handleUseCopilotHomeownerUpdate,
    )

    return () => {
      window.removeEventListener(
        "use-copilot-homeowner-update",
        handleUseCopilotHomeownerUpdate,
      )
    }
  }, [])

  useEffect(() => {
    function handleUseHomeownerAction(event: Event) {
      const customEvent = event as CustomEvent<{
        name: string
        homeowner_action_text?: string | null
        homeowner_visible_note?: string | null
        is_critical?: boolean | null
      }>

      const item = customEvent.detail
      if (!item) return

      setTitle(`Homeowner input needed: ${item.name}`)
      setType("selection_needed")
      setInternalSummary(
        `Homeowner action request created from task: ${item.name}${item.is_critical ? " (critical path impact possible)." : "."}`,
      )
      setHomeownerSummary(
        item.homeowner_action_text ||
          item.homeowner_visible_note ||
          "We need your input or approval to keep this part of the project moving.",
      )
      setRequiresHomeownerAction(true)
      setDraftSourceType("manual")
      setMessage(null)
    }

    window.addEventListener("use-homeowner-action-for-update", handleUseHomeownerAction)

    return () => {
      window.removeEventListener("use-homeowner-action-for-update", handleUseHomeownerAction)
    }
  }, [])

  async function refresh() {
    setLoading(true)
    setLoadingSuggestions(true)

    const [updatesResult, suggestionsResult] = await Promise.all([
      getProjectUpdates(projectId),
      getProjectUpdateSuggestions(projectId),
    ])

    if (updatesResult.success) {
      setUpdates((updatesResult.data || []) as ProjectUpdate[])
      setMessage(null)
    } else {
      setUpdates([])
      setMessage(updatesResult.error || "Failed to load project updates.")
    }

    if (suggestionsResult.success) {
      setSuggestions((suggestionsResult.data || []) as ProjectUpdateSuggestion[])
    } else {
      setSuggestions([])
    }

    setLoading(false)
    setLoadingSuggestions(false)
  }

  useEffect(() => {
    void refresh()
  }, [projectId])

  async function handleCreate() {
    if (!title.trim()) {
      setMessage("Title is required.")
      return
    }

    setSaving(true)
    setMessage(null)

    const result = await createProjectUpdate({
      projectId,
      title: title.trim(),
      type,
      internalSummary: internalSummary || null,
      homeownerSummary: homeownerSummary || null,
      requiresHomeownerAction,
      sourceType: draftSourceType,
    })

    if (!result.success) {
      setMessage(result.error || "Failed to create update.")
      setSaving(false)
      return
    }

    setTitle("")
    setType("progress")
    setInternalSummary("")
    setHomeownerSummary("")
    setRequiresHomeownerAction(false)
    setDraftSourceType("manual")
    setMessage(null)

    await refresh()
    setSaving(false)
  }

  async function handleDraftFromProjectState(
    mode: "general" | "weekly" | "delay" | "milestone" | "homeowner_action" = "general",
  ) {
    setDrafting(true)
    setMessage(null)

    try {
      const result = await draftProjectUpdateFromTasks(projectId, mode)

      if (!result.success || !result.data) {
        setMessage(result.error || "Failed to draft project update.")
        setDrafting(false)
        return
      }

      setTitle(result.data.title || "")
      setType(result.data.type || "progress")
      setInternalSummary(result.data.internal_summary || "")
      setHomeownerSummary(result.data.homeowner_summary || "")
      setRequiresHomeownerAction(!!result.data.requires_homeowner_action)
      setDraftSourceType("ai_generated")
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to draft project update."
      setMessage(msg)
    } finally {
      setDrafting(false)
    }
  }

  function applySuggestion(suggestion: ProjectUpdateSuggestion) {
    setTitle(suggestion.title)
    setType(suggestion.type)
    setInternalSummary(suggestion.internal_summary)
    setHomeownerSummary(suggestion.homeowner_summary)
    setRequiresHomeownerAction(suggestion.requires_homeowner_action)
    setDraftSourceType("manual")
    setMessage(null)
  }

  async function handleTogglePublish(update: ProjectUpdate) {
    const result = await updateProjectUpdate({
      updateId: update.id,
      isPublished: !update.is_published,
    })

    if (!result.success) {
      setMessage(result.error || "Failed to update publish state.")
      return
    }

    await refresh()
  }

  async function handleDelete(updateId: string) {
    const result = await deleteProjectUpdate(updateId)

    if (!result.success) {
      setMessage(result.error || "Failed to delete update.")
      return
    }

    await refresh()
  }

  return (
    <section className="rounded-[20px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
          Project Updates
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Draft, review, and publish homeowner-facing project updates.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <SectionCard
            title="Suggested Updates"
            subtitle="Recommendations based on blockers, inspections, homeowner actions, and progress."
          >
            {loadingSuggestions ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                Loading suggestions...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                No update suggestions right now.
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.key}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-100">
                          {suggestion.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {suggestion.reason}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Draft a New Update"
            subtitle="Create a manual update or generate one from the current project state."
          >
            <div className="space-y-4">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setDraftSourceType("manual")
                }}
                placeholder="Update title"
                className="border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500"
              />

              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as ProjectUpdate["type"])
                  setDraftSourceType("manual")
                }}
              >
                <SelectTrigger className="border-zinc-800 bg-black text-zinc-100">
                  <SelectValue placeholder="Select update type" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  {PROJECT_UPDATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                value={internalSummary}
                onChange={(e) => {
                  setInternalSummary(e.target.value)
                  setDraftSourceType("manual")
                }}
                placeholder="Internal summary"
                className="min-h-[110px] border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500"
              />

              <Textarea
                value={homeownerSummary}
                onChange={(e) => {
                  setHomeownerSummary(e.target.value)
                  setDraftSourceType("manual")
                }}
                placeholder="Homeowner-facing summary"
                className="min-h-[140px] border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500"
              />

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm font-medium text-zinc-300">
                <input
                  type="checkbox"
                  checked={requiresHomeownerAction}
                  onChange={(e) => {
                    setRequiresHomeownerAction(e.target.checked)
                    setDraftSourceType("manual")
                  }}
                  className="h-4 w-4"
                />
                Requires homeowner action
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDraftFromProjectState("weekly")}
                  disabled={drafting}
                  className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  {drafting ? "Drafting..." : "Draft Weekly Update"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDraftFromProjectState("delay")}
                  disabled={drafting}
                  className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  Draft Delay Notice
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDraftFromProjectState("milestone")}
                  disabled={drafting}
                  className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  Draft Milestone Update
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDraftFromProjectState("homeowner_action")}
                  disabled={drafting}
                  className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  Draft Homeowner Action
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDraftFromProjectState("general")}
                  disabled={drafting}
                  className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  Draft General Update
                </Button>

                <Button
                  onClick={handleCreate}
                  disabled={saving}
                  className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  {saving ? "Saving..." : "Create Update"}
                </Button>
              </div>

              {message ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {message}
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Published and Draft Updates"
            subtitle="Review current project communications before publishing or deleting them."
          >
            {loading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                Loading updates...
              </div>
            ) : updates.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                No project updates yet. Use the draft buttons to generate a weekly summary,
                delay notice, milestone update, or homeowner action request.
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <article
                    key={update.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-100">
                          {update.title}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-zinc-800 bg-black px-2.5 py-1 font-medium capitalize text-zinc-300">
                            {update.type.replaceAll("_", " ")}
                          </span>

                          {update.source_type ? (
                            <span className="rounded-full border border-zinc-800 bg-black px-2.5 py-1 font-medium text-zinc-400">
                              {update.source_type === "ai_generated"
                                ? "AI Draft"
                                : update.source_type}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          update.is_published
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : "border border-zinc-800 bg-black text-zinc-300"
                        }`}
                      >
                        {update.is_published ? "Published" : "Draft"}
                      </span>
                    </div>

                    {update.internal_summary ? (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-300">
                        <span className="font-semibold text-zinc-100">Internal:</span>{" "}
                        {update.internal_summary}
                      </div>
                    ) : null}

                    {update.homeowner_summary ? (
                      <div className="mt-3 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-300">
                        <span className="font-semibold text-zinc-100">Homeowner:</span>{" "}
                        {update.homeowner_summary}
                      </div>
                    ) : null}

                    {update.requires_homeowner_action ? (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                        Homeowner action required
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                        onClick={() => handleTogglePublish(update)}
                      >
                        {update.is_published ? "Unpublish" : "Publish"}
                      </Button>

                      <Button
                        variant="outline"
                        className="border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                        onClick={() => handleDelete(update.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </section>
  )
}