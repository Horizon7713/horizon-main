"use client"

import { useMemo, useState, useTransition } from "react"
import { addCaptureImage, createCaptureSession } from "@/app/project_visuals/actions"
import { supabase } from "@/lib/supabase/client"

type CaptureSessionUploaderProps = {
  projectId: string
}

const SHOT_OPTIONS = [
  "front",
  "rear",
  "left",
  "right",
  "front_left_corner",
  "front_right_corner",
  "rear_left_corner",
  "rear_right_corner",
  "perimeter",
  "interior",
  "detail",
]

export function CaptureSessionUploader({ projectId }: CaptureSessionUploaderProps) {
  const [milestoneKey, setMilestoneKey] = useState("footings")
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const fileNames = useMemo(() => files.map((file) => file.name), [files])

  const handleUpload = () => {
    if (files.length === 0) {
      setMessage("Please choose at least one image.")
      return
    }

    setMessage("")

    startTransition(async () => {
      try {
        const session = await createCaptureSession({
          projectId,
          milestoneKey,
          notes,
        })

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i]
          const fileExt = file.name.split(".").pop() || "jpg"
          const safeName = `${Date.now()}-${i}.${fileExt}`
          const storagePath = `${projectId}/${session.id}/${safeName}`

          const { error: uploadError } = await supabase.storage
            .from("project-captures")
            .upload(storagePath, file, {
              upsert: false,
            })

          if (uploadError) {
            throw new Error(uploadError.message)
          }

          const { data: publicLikeUrl } = supabase.storage
            .from("project-captures")
            .getPublicUrl(storagePath)

          await addCaptureImage({
            captureSessionId: session.id,
            filePath: publicLikeUrl.publicUrl,
            shotType: SHOT_OPTIONS[i] || "detail",
            sortOrder: i,
            metadata: {
              fileName: file.name,
              size: file.size,
              type: file.type,
            },
          })
        }

                const processResponse = await fetch("/api/project-visuals/process-capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            captureSessionId: session.id,
          }),
        })

        if (!processResponse.ok) {
          const processPayload = await processResponse.json().catch(() => null)
          throw new Error(processPayload?.error || "Capture uploaded, but processing failed.")
        }

        setFiles([])
        setNotes("")
        setMessage("Capture session uploaded and processed.")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to upload capture session.")
      }
    })
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Actual Site Progress
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">Capture Session Uploader</div>
        <div className="mt-1 text-sm text-zinc-400">
          Upload progress photos so the homeowner dashboard shows real site conditions.
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Milestone</div>
          <input
            value={milestoneKey}
            onChange={(e) => setMilestoneKey(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
            placeholder="footings"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">Progress Photos</div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <div className="text-xs font-medium text-zinc-300">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none"
            placeholder="Footings poured on north and west sides. Awaiting east section inspection."
          />
        </label>
      </div>

      <div className="border-t border-zinc-800 px-5 py-4">
        <div className="rounded-2xl border border-zinc-800 bg-black p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Selected Files
          </div>

          {fileNames.length > 0 ? (
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              {fileNames.map((name) => (
                <div key={name} className="truncate">
                  {name}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-zinc-500">No files selected yet.</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            className="rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {isPending ? "Uploading..." : "Upload Capture Session"}
          </button>

          {message ? <div className="text-sm text-zinc-400">{message}</div> : null}
        </div>
      </div>
    </section>
  )
}