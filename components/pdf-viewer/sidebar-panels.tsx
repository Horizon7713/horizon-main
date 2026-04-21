"use client";

import React from "react";
import type { ViewerSidebarTab } from "@/lib/pdf-viewer-types";

interface SidebarPanelsProps {
  activeTab: ViewerSidebarTab;
  markupsPanel?: React.ReactNode;
  propertiesPanel?: React.ReactNode;
  regionsPanel?: React.ReactNode;
  takeoffsPanel?: React.ReactNode;
  qrPanel?: React.ReactNode;
}

export function SidebarPanels({
  activeTab,
  markupsPanel,
  propertiesPanel,
  regionsPanel,
  takeoffsPanel,
  qrPanel,
}: SidebarPanelsProps) {
  const tabs: Array<{ key: ViewerSidebarTab; label: string }> = [
    { key: "markups", label: "Markups" },
    { key: "properties", label: "Properties" },
    { key: "regions", label: "Zones" },
    { key: "takeoffs", label: "Takeoffs" },
    { key: "qr", label: "QR" },
  ];

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Workspace Panels
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <div
                key={tab.key}
                className={
                  isActive
                    ? "rounded-md border border-blue-500 bg-blue-500/10 px-2 py-1 text-xs text-blue-100"
                    : "rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400"
                }
              >
                {tab.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {activeTab === "markups" ? markupsPanel : null}
        {activeTab === "properties" ? propertiesPanel : null}
        {activeTab === "regions" ? regionsPanel : null}
        {activeTab === "takeoffs" ? takeoffsPanel : null}
        {activeTab === "qr" ? qrPanel : null}
      </div>
    </div>
  );
}