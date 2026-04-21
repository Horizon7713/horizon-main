"use client"

import { useMemo, useState, useTransition } from "react"
import { saveHouseModel } from "@/app/project_visuals/actions"
import { createSimpleRectHouseSchema } from "@/lib/house-model/schema"

type HouseModelEditorProps = {
  projectId: string
}

export function HouseModelEditor({ projectId }: HouseModelEditorProps) {
  const [width, setWidth] = useState(42)
  const [depth, setDepth] = useState(30)
  const [levels, setLevels] = useState(1)
  const [wallHeight, setWallHeight] = useState(10)
  const [roofType, setRoofType] = useState<"gable" | "hip" | "shed" | "flat">("gable")
  const [foundationType, setFoundationType] = useState<"slab" | "crawlspace" | "basement">("slab")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const preview = useMemo(() => {
    return createSimpleRectHouseSchema({
      width,
      depth,
      levels,
      wallHeight,
      roofType,
      foundationType,
    })
  }, [width, depth, levels, wallHeight, roofType, foundationType])

  const handleSave = () => {
    setMessage("")

    startTransition(async () => {
      try {
        await saveHouseModel({
          projectId,
          schema: preview,
          status: "ready",
        })

        setMessage("House model saved.")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save house model.")
      }
    })
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Homeowner Visuals
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">House Model Editor</div>
        <div className="mt-1 text-sm text-zinc-400">
          Save a project-specific house model that powers the homeowner 3D dashboard.
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Width</div>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Depth</div>
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Levels</div>
          <input
            type="number"
            min={1}
            max={4}
            value={levels}
            onChange={(e) => setLevels(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Wall Height</div>
          <input
            type="number"
            value={wallHeight}
            onChange={(e) => setWallHeight(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Roof Type</div>
          <select
            value={roofType}
            onChange={(e) => setRoofType(e.target.value as "gable" | "hip" | "shed" | "flat")}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value="gable">Gable</option>
            <option value="hip">Hip</option>
            <option value="shed">Shed</option>
            <option value="flat">Flat</option>
          </select>
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Foundation Type</div>
          <select
            value={foundationType}
            onChange={(e) =>
              setFoundationType(e.target.value as "slab" | "crawlspace" | "basement")
            }
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value="slab">Slab</option>
            <option value="crawlspace">Crawlspace</option>
            <option value="basement">Basement</option>
          </select>
        </label>
      </div>

      <div className="border-t border-zinc-800 px-5 py-4">
        <div className="rounded-2xl border border-zinc-800 bg-black p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Preview Summary
          </div>
          <div className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
            <div>Width: {width}</div>
            <div>Depth: {depth}</div>
            <div>Levels: {levels}</div>
            <div>Wall Height: {wallHeight}</div>
            <div>Roof: {roofType}</div>
            <div>Foundation: {foundationType}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save House Model"}
          </button>

          {message ? <div className="text-sm text-zinc-400">{message}</div> : null}
        </div>
      </div>
    </section>
  )
}