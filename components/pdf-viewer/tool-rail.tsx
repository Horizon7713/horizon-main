"use client";

import React from "react";
import type { ViewerTool } from "@/lib/pdf-viewer-types";

interface ToolRailProps {
  activeTool?: ViewerTool;
  onToolChange?: (tool: ViewerTool) => void;
}

const TOOL_GROUPS: Array<{
  title: string;
  tools: Array<{ key: ViewerTool; label: string; hint: string }>;
}> = [
  {
    title: "Navigate",
    tools: [
      { key: "select", label: "Select", hint: "Select zones and markups" },
      { key: "pan", label: "Pan", hint: "Move around the page" },
    ],
  },
  {
    title: "Zones",
    tools: [
      {
        key: "region-rectangle",
        label: "Scope Zone",
        hint: "Click points to trace a zone and snap closed",
      },
    ],
  },
  {
    title: "Takeoff",
    tools: [
      {
        key: "rectangle",
        label: "Item Box",
        hint: "Drag a takeoff item box",
      },
      {
        key: "measure-length",
        label: "Length",
        hint: "Measure a calibrated length",
      },
      {
        key: "measure-area",
        label: "Area",
        hint: "Drag a calibrated area box",
      },
      {
        key: "measure-count",
        label: "Count",
        hint: "Drop count markers",
      },
      {
        key: "calibrate",
        label: "Scale",
        hint: "Pick a known dimension and set scale",
      },
    ],
  },
  {
    title: "Markup",
    tools: [
      { key: "arrow", label: "Arrow", hint: "Directional callout" },
      { key: "text", label: "Text", hint: "Add a text note" },
      { key: "ellipse", label: "Ellipse", hint: "Ellipse markup" },
    ],
  },
];

export function ToolRail({
  activeTool = "select",
  onToolChange,
}: ToolRailProps) {
  return (
    <div className="flex h-full w-[96px] flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Tools
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-4">
          {TOOL_GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {group.title}
              </div>

              <div className="space-y-1">
                {group.tools.map((tool) => {
                  const isActive = activeTool === tool.key;

                  return (
                    <button
                      key={tool.key}
                      type="button"
                      onClick={() => onToolChange?.(tool.key)}
                      title={tool.hint}
                      className={[
                        "group flex w-full flex-col rounded-xl border px-2 py-2 text-left transition-all",
                        isActive
                          ? "border-blue-500 bg-blue-500/15 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
                          : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <span className="text-[11px] font-semibold leading-none">
                        {tool.label}
                      </span>
                      <span className="mt-1 text-[9px] leading-tight text-zinc-400 group-hover:text-zinc-300">
                        {tool.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}