"use client";

import React, { useMemo, useState } from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";

function getPixelDistance(
  start?: { x: number; y: number },
  end?: { x: number; y: number }
) {
  if (!start || !end) return 0;
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function ScaleCalibrationDialog() {
  const { state, closeCalibrationDialog, setCalibration } = usePdfViewer();

  const [knownLength, setKnownLength] = useState(
    String(state.calibration.lastKnownLength ?? "")
  );
  const [drawingUnit, setDrawingUnit] = useState(state.calibration.drawingUnit);
  const [realWorldUnit, setRealWorldUnit] = useState(state.calibration.realWorldUnit);
  const [precision, setPrecision] = useState(String(state.calibration.precision ?? 2));

  const measuredPixelDistance = useMemo(() => {
    return getPixelDistance(
      state.calibration.calibrationStart,
      state.calibration.calibrationEnd
    );
  }, [state.calibration.calibrationStart, state.calibration.calibrationEnd]);

  const computedScaleRatio = useMemo(() => {
    const realLength = Number(knownLength);
    if (!realLength || !measuredPixelDistance) return 0;
    return realLength / measuredPixelDistance;
  }, [knownLength, measuredPixelDistance]);

  const handleApply = () => {
    const realLength = Number(knownLength);
    if (!realLength || !measuredPixelDistance) return;

    setCalibration({
      scaleRatio: computedScaleRatio,
      drawingUnit,
      realWorldUnit,
      precision: Number(precision) || 2,
      isCalibrated: true,
      calibrationStart: state.calibration.calibrationStart,
      calibrationEnd: state.calibration.calibrationEnd,
      lastKnownLength: realLength,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl">
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="text-lg font-semibold">Calibrate Page Scale</div>
          <div className="mt-1 text-sm text-zinc-400">
            Pick a known dimension on the page, then enter the real-world length.
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm">
            <div className="text-zinc-400">Measured page distance</div>
            <div className="mt-1 font-medium text-zinc-100">
              {measuredPixelDistance.toFixed(2)} px
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Real-world length
            </label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={knownLength}
              onChange={(e) => setKnownLength(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="Enter known length"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Drawing Unit
              </label>
              <select
                value={drawingUnit}
                onChange={(e) => setDrawingUnit(e.target.value as typeof drawingUnit)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="in">Inches</option>
                <option value="ft">Feet</option>
                <option value="mm">Millimeters</option>
                <option value="cm">Centimeters</option>
                <option value="m">Meters</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Real World Unit
              </label>
              <select
                value={realWorldUnit}
                onChange={(e) => setRealWorldUnit(e.target.value as typeof realWorldUnit)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="in">Inches</option>
                <option value="ft">Feet</option>
                <option value="mm">Millimeters</option>
                <option value="cm">Centimeters</option>
                <option value="m">Meters</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Precision
            </label>
            <input
              type="number"
              min="0"
              max="6"
              step="1"
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
            <div className="text-zinc-400">Computed scale ratio</div>
            <div className="mt-1 font-medium text-blue-100">
              {computedScaleRatio ? computedScaleRatio.toFixed(8) : "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            className="rounded border border-zinc-700 px-4 py-2 text-sm"
            onClick={closeCalibrationDialog}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded border border-blue-500 px-4 py-2 text-sm text-blue-100 disabled:opacity-50"
            onClick={handleApply}
            disabled={!computedScaleRatio}
          >
            Apply Scale
          </button>
        </div>
      </div>
    </div>
  );
}