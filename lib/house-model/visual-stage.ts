export type VisualStage =
  | "site_prep"
  | "excavation"
  | "footings"
  | "foundation"
  | "framing"
  | "roofing"
  | "enclosed"
  | "rough_in"
  | "insulation"
  | "drywall"
  | "interior_finish"
  | "cabinetry"
  | "flooring"
  | "punch_list"
  | "complete"

export const VISUAL_STAGE_LABELS: Record<VisualStage, string> = {
  site_prep: "Site Prep",
  excavation: "Excavation",
  footings: "Footings",
  foundation: "Foundation",
  framing: "Framing",
  roofing: "Roofing",
  enclosed: "Enclosed",
  rough_in: "Rough In",
  insulation: "Insulation",
  drywall: "Drywall",
  interior_finish: "Interior Finish",
  cabinetry: "Cabinetry",
  flooring: "Flooring",
  punch_list: "Punch List",
  complete: "Complete",
}

const ORDER: VisualStage[] = [
  "site_prep",
  "excavation",
  "footings",
  "foundation",
  "framing",
  "roofing",
  "enclosed",
  "rough_in",
  "insulation",
  "drywall",
  "interior_finish",
  "cabinetry",
  "flooring",
  "punch_list",
  "complete",
]

export function getVisualStageIndex(stage: VisualStage) {
  return ORDER.indexOf(stage)
}

export function getVisualStageLabel(stage: VisualStage) {
  return VISUAL_STAGE_LABELS[stage]
}

export function getStageVisibility(stage: VisualStage) {
  const idx = getVisualStageIndex(stage)

  return {
    showGround: idx >= 0,
    showExcavation: idx >= 1,
    showFootings: idx >= 2,
    showFoundationWalls: idx >= 3,
    showSlab: idx >= 3,
    showFloorDeck: idx >= 4,
    showFraming: idx >= 4,
    showRoofFrame: idx >= 5,
    showRoofShell: idx >= 5,
    showExteriorShell: idx >= 6,
    showOpenings: idx >= 6,
    showRoughIn: idx >= 7,
    showInsulation: idx >= 8,
    showDrywall: idx >= 9,
    showInteriorFinish: idx >= 10,
    showCabinetry: idx >= 11,
    showFlooring: idx >= 12,
    showPunchList: idx >= 13,
    showCompleteBadge: idx >= 14,
  }
}