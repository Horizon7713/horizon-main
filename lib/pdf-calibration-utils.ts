// ============================================================================
// Calibration Utilities
// Handles per-page scale calibration for the plan viewer.
// ============================================================================

import { PageScale } from './pdf-viewer-types'

// ---------------------------------------------------------------------------
// Preset architectural scales
// ---------------------------------------------------------------------------
export interface ScalePreset {
  label: string
  /** real-world inches per drawing inch */
  realInchesPerDrawingInch: number
}

export const SCALE_PRESETS: ScalePreset[] = [
  { label: '1" = 1\'-0"  (Full)',    realInchesPerDrawingInch: 12 },
  { label: '3/4" = 1\'-0"',          realInchesPerDrawingInch: 16 },
  { label: '1/2" = 1\'-0"',          realInchesPerDrawingInch: 24 },
  { label: '3/8" = 1\'-0"',          realInchesPerDrawingInch: 32 },
  { label: '1/4" = 1\'-0"',          realInchesPerDrawingInch: 48 },
  { label: '3/16" = 1\'-0"',         realInchesPerDrawingInch: 64 },
  { label: '1/8" = 1\'-0"',          realInchesPerDrawingInch: 96 },
  { label: '3/32" = 1\'-0"',         realInchesPerDrawingInch: 128 },
  { label: '1/16" = 1\'-0"',         realInchesPerDrawingInch: 192 },
  { label: '1" = 10\'-0"  (Site)',   realInchesPerDrawingInch: 120 },
  { label: '1" = 20\'-0"  (Site)',   realInchesPerDrawingInch: 240 },
  { label: '1" = 40\'-0"  (Site)',   realInchesPerDrawingInch: 480 },
]

/**
 * Compute inchesPerPixel from a preset scale and the PDF's DPI.
 * Standard PDF DPI = 72.
 */
export function presetToInchesPerPixel(preset: ScalePreset, pdfDpi = 72): number {
  return preset.realInchesPerDrawingInch / pdfDpi
}

/**
 * Compute `inchesPerPixel` from a calibration reference line.
 *
 * @param pixelDistance  Length of the calibration line in PDF-space pixels.
 * @param realFeet      Real-world feet component of the reference distance.
 * @param realInches    Real-world inches component of the reference distance.
 * @returns The computed inchesPerPixel value.
 */
export function computeCalibration(pixelDistance: number, realFeet: number, realInches: number): number {
  const totalInches = realFeet * 12 + realInches
  if (pixelDistance <= 0 || totalInches <= 0) return 0
  return totalInches / pixelDistance
}

/**
 * Build a PageScale record from calibration inputs.
 */
export function buildPageScale(
  pageNumber: number,
  pixelDistance: number,
  realFeet: number,
  realInches: number,
): PageScale {
  return {
    pageNumber,
    inchesPerPixel: computeCalibration(pixelDistance, realFeet, realInches),
  }
}

/**
 * Upsert a page scale into an existing array (replace if same page, else append).
 */
export function upsertPageScale(scales: PageScale[], newScale: PageScale): PageScale[] {
  const filtered = scales.filter((s) => s.pageNumber !== newScale.pageNumber)
  return [...filtered, newScale]
}
