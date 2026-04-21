"use client";

import React from "react";

interface ViewportControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit?: () => void;
}

export function ViewportControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: ViewportControlsProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
      <button type="button" className="px-2 py-1 border rounded" onClick={onZoomOut}>
        -
      </button>
      <div className="min-w-16 text-center text-sm">{Math.round(zoom * 100)}%</div>
      <button type="button" className="px-2 py-1 border rounded" onClick={onZoomIn}>
        +
      </button>
      {onFit ? (
        <button type="button" className="px-2 py-1 border rounded" onClick={onFit}>
          Fit
        </button>
      ) : null}
    </div>
  );
}