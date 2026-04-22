// ============================================================================
// Calibration Utilities
// Handles per-page scale calibration for the plan viewer.
// ============================================================================

export interface PageScale {
  pageNumber: number
  inchesPerPixel: number
  label?: string
}

export interface ScalePreset {
  label: string
  /** real-world inches per drawing inch */
  realInchesPerDrawingInch: number
}

export const SCALE_PRESETS: ScalePreset[] = [
  { label: '1" = 1\'-0"  (Full)', realInchesPerDrawingInch: 12 },
  { label: '3/4" = 1\'-0"', realInchesPerDrawingInch: 16 },
  { label: '1/2" = 1\'-0"', realInchesPerDrawingInch: 24 },
  { label: '3/8" = 1\'-0"', realInchesPerDrawingInch: 32 },
  { label: '1/4" = 1\'-0"', realInchesPerDrawingInch: 48 },
  { label: '3/16" = 1\'-0"', realInchesPerDrawingInch: 64 },
  { label: '1/8" = 1\'-0"', realInchesPerDrawingInch: 96 },
  { label: '3/32" = 1\'-0"', realInchesPerDrawingInch: 128 },
  { label: '1/16" = 1\'-0"', realInchesPerDrawingInch: 192 },
  { label: '1" = 10\'-0"  (Site)', realInchesPerDrawingInch: 120 },
  { label: '1" = 20\'-0"  (Site)', realInchesPerDrawingInch: 240 },
  { label: '1" = 40\'-0"  (Site)', realInchesPerDrawingInch: 480 },
]

export function presetToInchesPerPixel(preset: ScalePreset, pdfUnitsPerDrawingInch = 72): number {
  if (pdfUnitsPerDrawingInch <= 0) return 0
  return preset.realInchesPerDrawingInch / pdfUnitsPerDrawingInch
}

export function computeCalibration(
  pixelDistance: number,
  realFeet: number,
  realInches: number,
): number {
  const totalInches = realFeet * 12 + realInches
  if (pixelDistance <= 0 || totalInches <= 0) return 0
  return totalInches / pixelDistance
}

export function buildPageScale(
  pageNumber: number,
  pixelDistance: number,
  realFeet: number,
  realInches: number,
  label?: string,
): PageScale {
  return {
    pageNumber,
    inchesPerPixel: computeCalibration(pixelDistance, realFeet, realInches),
    label,
  }
}

export function upsertPageScale(scales: PageScale[], newScale: PageScale): PageScale[] {
  const filtered = scales.filter((s) => s.pageNumber !== newScale.pageNumber)
  return [...filtered, newScale]
}