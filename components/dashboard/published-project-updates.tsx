"use client"

import { ProjectUpdate } from "@/components/projects/tasks/task-types"

function getUpdateTone(type: ProjectUpdate["type"]) {
  switch (type) {
    case "delay":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200"
    case "milestone":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    case "selection_needed":
      return "border-blue-500/20 bg-blue-500/10 text-blue-200"
    case "issue":
      return "border-red-500/20 bg-red-500/10 text-red-200"
    case "inspection":
      return "border-violet-500/20 bg-violet-500/10 text-violet-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Recently"

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "Recently"

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PublishedProjectUpdates({
  updates,
}: {
  updates: ProjectUpdate[]
}) {
  if (updates.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-10 text-center text-sm text-zinc-500">
        No published project updates yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <article
          key={update.id}
          className="rounded-2xl border border-zinc-800 bg-black p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100">
                {update.title}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full border px-2.5 py-1 font-medium capitalize ${getUpdateTone(update.type)}`}
                >
                  {update.type.replaceAll("_", " ")}
                </span>

                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-zinc-400">
                  {formatDate(update.published_at || update.created_at)}
                </span>
              </div>
            </div>

            {update.requires_homeowner_action ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                Action Needed
              </span>
            ) : null}
          </div>

          {update.homeowner_summary ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-300">
              {update.homeowner_summary}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}