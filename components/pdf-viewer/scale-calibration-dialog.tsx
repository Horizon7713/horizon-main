'use client'

import React, { useState, useEffect } from 'react'
import { PageScale } from '@/lib/pdf-viewer-types'
import { computeCalibration, buildPageScale } from '@/lib/pdf-calibration-utils'
import { formatFeetInches } from '@/lib/pdf-measurement-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Common architectural plan scale presets
// Each expresses how many real-world inches correspond to 1 drawing inch.
// e.g. 1/8" = 1'-0"  means  1 drawing-inch = 8 real-feet = 96 real-inches
// ---------------------------------------------------------------------------
interface ScalePreset {
  label: string
  /** real-world inches per drawing inch */
  realInchesPerDrawingInch: number
}

const SCALE_PRESETS: ScalePreset[] = [
  { label: '1" = 1\'-0"  (Full)',        realInchesPerDrawingInch: 12 },
  { label: '3/4" = 1\'-0"',              realInchesPerDrawingInch: 16 },
  { label: '1/2" = 1\'-0"',              realInchesPerDrawingInch: 24 },
  { label: '3/8" = 1\'-0"',              realInchesPerDrawingInch: 32 },
  { label: '1/4" = 1\'-0"',              realInchesPerDrawingInch: 48 },
  { label: '3/16" = 1\'-0"',             realInchesPerDrawingInch: 64 },
  { label: '1/8" = 1\'-0"',              realInchesPerDrawingInch: 96 },
  { label: '3/32" = 1\'-0"',             realInchesPerDrawingInch: 128 },
  { label: '1/16" = 1\'-0"',             realInchesPerDrawingInch: 192 },
  { label: '1" = 10\'-0"  (Site)',       realInchesPerDrawingInch: 120 },
  { label: '1" = 20\'-0"  (Site)',       realInchesPerDrawingInch: 240 },
  { label: '1" = 40\'-0"  (Site)',       realInchesPerDrawingInch: 480 },
]

interface ScaleCalibrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageNumber: number
  currentScale: PageScale | null
  onScaleSet: (scale: PageScale) => void
  calibrationPixelDistance?: number | null
}

export function ScaleCalibrationDialog({
  open,
  onOpenChange,
  pageNumber,
  currentScale,
  onScaleSet,
  calibrationPixelDistance,
}: ScaleCalibrationDialogProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('custom')
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<string>('')

  // Custom mode state
  const [pixelDistance, setPixelDistance] = useState('100')
  const [feet, setFeet] = useState('0')
  const [inches, setInches] = useState('12')

  // Preset mode needs the PDF DPI to convert drawing inches to pixels.
  // Default PDF DPI is 72. When a calibration line is provided we can
  // infer more precisely, but 72 is the standard fallback.
  const [pdfDpi, setPdfDpi] = useState('72')

  // Pre-fill from calibration line
  useEffect(() => {
    if (calibrationPixelDistance != null && calibrationPixelDistance > 0) {
      setPixelDistance(calibrationPixelDistance.toFixed(1))
      setMode('custom') // calibration line → custom mode makes most sense
    }
  }, [calibrationPixelDistance])

  // Pre-fill from existing page scale
  useEffect(() => {
    if (open && currentScale && currentScale.inchesPerPixel > 0) {
      const refPx = 100
      const totalIn = refPx * currentScale.inchesPerPixel
      setPixelDistance(refPx.toString())
      setFeet(Math.floor(totalIn / 12).toString())
      setInches((totalIn % 12).toFixed(2))
    }
  }, [open, currentScale])

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  // Custom mode
  const totalInches = parseFloat(feet || '0') * 12 + parseFloat(inches || '0')
  const pxDist = parseFloat(pixelDistance || '0')
  const customIpp = pxDist > 0 && totalInches > 0
    ? computeCalibration(pxDist, parseFloat(feet || '0'), parseFloat(inches || '0'))
    : 0

  // Preset mode — inchesPerPixel = realInchesPerDrawingInch / pdfDpi
  const dpi = parseFloat(pdfDpi || '72') || 72
  const selectedPreset = selectedPresetIdx !== '' ? SCALE_PRESETS[parseInt(selectedPresetIdx)] : null
  const presetIpp = selectedPreset ? selectedPreset.realInchesPerDrawingInch / dpi : 0

  const activeIpp = mode === 'preset' ? presetIpp : customIpp
  const canConfirm = activeIpp > 0

  const handleSetScale = () => {
    if (!canConfirm) return
    const scale: PageScale = { pageNumber, inchesPerPixel: activeIpp }
    onScaleSet(scale)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Measurement Scale (Page {pageNumber})</DialogTitle>
          <DialogDescription>
            Choose a preset architectural scale or enter a custom calibration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'preset' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('preset')}
            >
              Preset Scale
            </Button>
            <Button
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('custom')}
            >
              Custom / Calibrate
            </Button>
          </div>

          {/* Preset mode */}
          {mode === 'preset' && (
            <div className="space-y-3">
              <div>
                <Label>Architectural Scale</Label>
                <Select value={selectedPresetIdx} onValueChange={setSelectedPresetIdx}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a scale..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALE_PRESETS.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pdf-dpi">PDF DPI (default 72)</Label>
                <Input
                  id="pdf-dpi"
                  type="number"
                  min="1"
                  value={pdfDpi}
                  onChange={(e) => setPdfDpi(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Standard PDF DPI is 72. Change only if your document uses a different resolution.
                </p>
              </div>
            </div>
          )}

          {/* Custom mode */}
          {mode === 'custom' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="pixel-distance">Pixels on Drawing</Label>
                <Input
                  id="pixel-distance"
                  type="number"
                  min="1"
                  value={pixelDistance}
                  onChange={(e) => setPixelDistance(e.target.value)}
                  readOnly={!!calibrationPixelDistance}
                  className="mt-1.5"
                />
                {calibrationPixelDistance ? (
                  <p className="text-xs text-muted-foreground mt-1">Measured from your calibration line</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Use the Calibrate tool to draw a known-distance line on the plan</p>
                )}
              </div>

              <div>
                <Label>Real-World Distance</Label>
                <div className="flex gap-3 mt-1.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min="0" value={feet} onChange={(e) => setFeet(e.target.value)} placeholder="0" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">ft</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min="0" max="11.9375" step="0.0625" value={inches} onChange={(e) => setInches(e.target.value)} placeholder="0" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scale summary */}
          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-semibold mb-2">Scale Summary (Page {pageNumber})</p>
            {mode === 'preset' && selectedPreset ? (
              <>
                <p>{selectedPreset.label}</p>
                <p className="text-muted-foreground">1 pixel = {presetIpp.toFixed(6)} inches</p>
                <p className="text-muted-foreground">100 pixels = {formatFeetInches(presetIpp * 100)}</p>
              </>
            ) : mode === 'custom' && customIpp > 0 ? (
              <>
                <p>{pxDist.toFixed(1)} pixels = {formatFeetInches(totalInches)}</p>
                <p className="text-muted-foreground">1 pixel = {customIpp.toFixed(6)} inches</p>
              </>
            ) : (
              <p className="text-muted-foreground">Configure a scale above to see the summary.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSetScale} disabled={!canConfirm}>Set Scale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
