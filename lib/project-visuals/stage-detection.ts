import { HomeownerVisualStage } from "@/components/dashboard/homeowner-dashboard-utils"
import { StageDetectionResult } from "./processing-types"

type CaptureImageLike = {
  shot_type?: string | null
  metadata?: Record<string, unknown> | null
  file_path?: string | null
}

type CaptureSessionLike = {
  milestone_key?: string | null
  notes?: string | null
  images?: CaptureImageLike[]
}

const STAGE_KEYWORDS: Array<{
  stage: HomeownerVisualStage
  keywords: string[]
}> = [
  { stage: "site_prep", keywords: ["site prep", "clearing", "grading", "survey", "layout"] },
  { stage: "excavation", keywords: ["excavation", "excavate", "dig", "overdig", "pad prep"] },
  { stage: "footings", keywords: ["footing", "footings", "rebar footing", "form footing"] },
  { stage: "foundation", keywords: ["foundation", "stem wall", "slab", "crawlspace", "basement"] },
  { stage: "framing", keywords: ["framing", "frame", "truss", "joist", "shear wall"] },
  { stage: "roofing", keywords: ["roof", "roofing", "dry in", "dry-in", "shingle"] },
  { stage: "enclosed", keywords: ["window", "windows", "door install", "house wrap", "enclosed"] },
  { stage: "rough_in", keywords: ["rough in", "rough-in", "rough plumbing", "rough electrical", "rough hvac"] },
  { stage: "insulation", keywords: ["insulation", "spray foam", "batt"] },
  { stage: "drywall", keywords: ["drywall", "sheetrock", "texture"] },
  { stage: "interior_finish", keywords: ["paint", "trim", "finish carpentry", "interior finish"] },
  { stage: "cabinetry", keywords: ["cabinet", "cabinetry", "casework", "vanity install"] },
  { stage: "flooring", keywords: ["flooring", "tile", "lvp", "carpet", "wood floor"] },
  { stage: "punch_list", keywords: ["punch", "punch list", "touch up", "final clean"] },
  { stage: "complete", keywords: ["complete", "completion", "handoff", "turnover", "co"] },
]

function normalize(value?: string | null) {
  return (value || "").toLowerCase().trim()
}

function getSignalsFromText(value?: string | null) {
  const text = normalize(value)
  if (!text) return []

  const matches: string[] = []

  for (const entry of STAGE_KEYWORDS) {
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) {
        matches.push(`${entry.stage}:${keyword}`)
      }
    }
  }

  return matches
}

function scoreSignals(signals: string[]) {
  const stageScores = new Map<HomeownerVisualStage, number>()

  for (const signal of signals) {
    const [stage] = signal.split(":") as [HomeownerVisualStage, string]
    stageScores.set(stage, (stageScores.get(stage) || 0) + 1)
  }

  let bestStage: HomeownerVisualStage = "site_prep"
  let bestScore = 0

  for (const [stage, score] of stageScores.entries()) {
    if (score > bestScore) {
      bestStage = stage
      bestScore = score
    }
  }

  return { bestStage, bestScore, totalSignals: signals.length }
}

export function detectStageFromCaptureSession(
  session: CaptureSessionLike
): StageDetectionResult {
  const noteSignals = [
    ...getSignalsFromText(session.milestone_key),
    ...getSignalsFromText(session.notes),
  ]

  const imageSignals =
    session.images?.flatMap((image) => {
      const fileSignals = getSignalsFromText(image.file_path)
      const shotSignals = getSignalsFromText(image.shot_type)

      const metadataText = image.metadata
        ? JSON.stringify(image.metadata)
        : ""

      const metadataSignals = getSignalsFromText(metadataText)

      return [...fileSignals, ...shotSignals, ...metadataSignals]
    }) || []

  const allSignals = [...noteSignals, ...imageSignals]
  const { bestStage, bestScore, totalSignals } = scoreSignals(allSignals)

  const confidence =
    totalSignals === 0
      ? 0.35
      : Math.min(0.98, Math.max(0.45, bestScore / Math.max(totalSignals, 1)))

  const summary =
    totalSignals === 0
      ? "No strong stage signals were found. Defaulted to site prep."
      : `Detected ${bestStage} from ${bestScore} matching signals across notes and capture image metadata.`

  return {
    detectedStage: totalSignals === 0 ? "site_prep" : bestStage,
    confidence,
    summary,
    result: {
      source: "stage-detector-v1",
      milestoneKey: session.milestone_key || null,
      noteSignals,
      imageSignals,
      imageCount: session.images?.length || 0,
    },
  }
}