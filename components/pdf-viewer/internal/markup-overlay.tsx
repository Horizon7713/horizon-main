"use client";

import React from "react";
import type { PdfMarkup } from "@/lib/pdf-viewer-types";

interface MarkupOverlayProps {
  markups: PdfMarkup[];
  selectedMarkupIds: string[];
  onSelectMarkup?: (markupId: string) => void;
  draftMarkup?: PdfMarkup | null;
}

function rectStyle(
  markup: PdfMarkup & { bounds?: { x: number; y: number; width: number; height: number } }
): React.CSSProperties {
  if (!("bounds" in markup) || !markup.bounds) return {};
  return {
    position: "absolute",
    left: markup.bounds.x,
    top: markup.bounds.y,
    width: markup.bounds.width,
    height: markup.bounds.height,
    border: `${markup.style.strokeWidth}px solid ${markup.style.strokeColor}`,
    background: markup.style.fillColor ?? "transparent",
    opacity: markup.style.opacity,
    pointerEvents: "auto",
    boxSizing: "border-box",
  };
}

function lineBounds(start: { x: number; y: number }, end: { x: number; y: number }) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.max(1, Math.abs(end.x - start.x)),
    height: Math.max(1, Math.abs(end.y - start.y)),
  };
}

export function MarkupOverlay({
  markups,
  selectedMarkupIds,
  onSelectMarkup,
  draftMarkup,
}: MarkupOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...markups, ...(draftMarkup ? [draftMarkup] : [])].map((markup) => {
        const isSelected = selectedMarkupIds.includes(markup.id);

        if ("bounds" in markup) {
          return (
            <button
              key={markup.id}
              type="button"
              className="absolute bg-transparent text-left"
              style={{
                ...rectStyle(markup),
                outline: isSelected ? "2px solid #2563eb" : "none",
              }}
             onClick={(event) => {
  event.stopPropagation();
  onSelectMarkup?.(markup.id);
}}
            />
          );
        }

        if ("start" in markup && "end" in markup) {
          const bounds = lineBounds(markup.start, markup.end);
          return (
            <button
              key={markup.id}
              type="button"
              className="absolute border border-dashed bg-transparent"
              style={{
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
                borderColor: isSelected ? "#2563eb" : markup.style.strokeColor,
                opacity: markup.style.opacity,
                pointerEvents: "auto",
              }}
             onClick={(event) => {
  event.stopPropagation();
  onSelectMarkup?.(markup.id);
}}
            />
          );
        }

        if ("point" in markup) {
          return (
            <button
              key={markup.id}
              type="button"
              className="absolute rounded-full border"
              style={{
                left: markup.point.x - 6,
                top: markup.point.y - 6,
                width: 12,
                height: 12,
                borderColor: isSelected ? "#2563eb" : markup.style.strokeColor,
                background: markup.style.fillColor ?? "#fff",
                opacity: markup.style.opacity,
                pointerEvents: "auto",
              }}
              onClick={(event) => {
  event.stopPropagation();
  onSelectMarkup?.(markup.id);
}}
            />
          );
        }

        return null;
      })}
    </div>
  );
}