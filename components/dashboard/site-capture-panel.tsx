"use client"

import {
  getLatestReadyCaptureSession,
  SiteCaptureSession,
} from "@/lib/site-capture/capture-session"

type SiteCapturePanelProps = {
  sessions?: SiteCaptureSession[] | null
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SiteCapturePanel({
  sessions = [],
}: SiteCapturePanelProps) {
  const latest = getLatestReadyCaptureSession(sessions)

  if (!latest) {
    return (
      <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Actual Site Progress
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">Latest Site Capture</div>
          <div className="mt-1 text-sm text-zinc-400">
            Uploaded progress photos and future reconstruction outputs will appear here.
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-12 text-center text-sm text-zinc-500">
            No processed site capture session yet.
          </div>
        </div>
      </section>
    )
  }

  const galleryImages =
    latest.outputs?.filter((o) => o.output_type === "gallery_preview") || []
  const images = latest.images || []

  return (
    <section className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Actual Site Progress
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">Latest Site Capture</div>
        <div className="mt-1 text-sm text-zinc-400">
          Reality-based images from the field. Later this panel can also show mesh, splat, or point-cloud outputs.
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Capture Date
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {formatDate(latest.capture_date)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Milestone
            </div>
            <div className="mt-2 text-sm font-semibold capitalize text-zinc-100">
              {(latest.milestone_key || "general").replaceAll("_", " ")}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Images
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {images.length}
            </div>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {images.slice(0, 8).map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-black"
              >
                <img
                  src={image.file_path}
                  alt={image.shot_type || "Site capture image"}
                  className="h-44 w-full object-cover"
                />
                <div className="border-t border-zinc-800 px-3 py-2 text-xs capitalize text-zinc-400">
                  {(image.shot_type || "site_capture").replaceAll("_", " ")}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {galleryImages.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            Processed outputs available: {galleryImages.length}
          </div>
        ) : null}

        {latest.notes ? (
          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
            {latest.notes}
          </div>
        ) : null}
      </div>
    </section>
  )
}