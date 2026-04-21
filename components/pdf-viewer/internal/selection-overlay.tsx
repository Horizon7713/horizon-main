"use client";

import React from "react";
import type { PdfMarkup } from "@/lib/pdf-viewer-types";

interface SelectionOverlayProps {
  markup?: PdfMarkup;
}

export function SelectionOverlay({ markup }: SelectionOverlayProps) {
  if (!markup) return null;

  if ("bounds" in markup) {
    return (
      <div
        className="absolute border-2 border-blue-600 pointer-events-none"
        style={{
          left: markup.bounds.x - 2,
          top: markup.bounds.y - 2,
          width: markup.bounds.width + 4,
          height: markup.bounds.height + 4,
        }}
      />
    );
  }

  return null;
}