"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Layers3 } from "lucide-react"

interface PhaseColumnProps {
  phaseId: string
  label: string
  count: number
  children: ReactNode
}

export function PhaseColumn({
  phaseId,
  label,
  count,
  children,
}: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `phase:${phaseId}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        "w-[340px] shrink-0 overflow-hidden rounded-2xl border bg-zinc-950 transition",
        isOver
          ? "border-amber-500/30 bg-zinc-900 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
          : "border-zinc-800 bg-zinc-950",
      ].join(" ")}
    >
      <div className="border-b border-zinc-800 bg-black px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <Layers3 className="h-4 w-4 text-zinc-300" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-semibold tracking-tight text-zinc-100">
                  {label}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">Phase tasks</p>
              </div>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400">
            {count}
          </span>
        </div>
      </div>

      <div className="min-h-[240px] bg-zinc-950 p-3">{children}</div>
    </div>
  )
} 