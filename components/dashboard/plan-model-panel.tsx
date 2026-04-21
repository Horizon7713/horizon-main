"use client"

import {
  HouseModelSchema,
  normalizeHouseSchema,
} from "@/lib/house-model/schema"
import {
  getVisualStageLabel,
  VisualStage,
} from "@/lib/house-model/visual-stage"
import { ProjectProgress3D } from "./project-progress-3d"

type PlanModelPanelProps = {
  title?: string
  subtitle?: string
  stage: VisualStage
  schema?: Partial<HouseModelSchema> | null
  projectName?: string | null
}

export function PlanModelPanel({
  title = "Planned Build Model",
  subtitle = "A generated 3D model of the home based on your plans and current construction stage.",
  stage,
  schema,
  projectName,
}: PlanModelPanelProps) {
  const normalized = normalizeHouseSchema(schema)

  return (
    <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Plan-Based Visualization
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
      </div>

      <div className="p-5">
        <ProjectProgress3D stage={stage} schema={normalized} height={420} />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Current Stage
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {getVisualStageLabel(stage)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Levels
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {normalized.levels}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Project
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {projectName || normalized.metadata?.name || "Current Home"}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}