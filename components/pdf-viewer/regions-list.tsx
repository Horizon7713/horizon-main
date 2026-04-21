"use client";

import React from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";

export function RegionsList() {
  const { state, selectRegion, deleteRegion, setSidebarTab } = usePdfViewer();

  const pageZones = state.regions.filter(
    (region) => region.pageIndex === state.document.currentPageIndex
  );

  if (pageZones.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-400">
        No scope zones on this page yet.
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Scope Zone Register · Page {state.document.currentPageIndex + 1}
      </div>

      <div className="space-y-2">
        {pageZones.map((zone) => {
          const isSelected = state.selection.selectedRegionId === zone.id;
          const linkedMarkups = state.markups.filter(
            (markup) => markup.regionId === zone.id
          );

          const categories = Array.from(
            new Set(
              linkedMarkups
                .map((markup) => markup.material?.category)
                .filter(Boolean)
            )
          );

          const suppliers = Array.from(
            new Set(
              linkedMarkups
                .map((markup) => markup.material?.supplier)
                .filter(Boolean)
            )
          );

          return (
            <div
              key={zone.id}
              className={[
                "rounded-xl border p-3 transition",
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/70",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => {
                  selectRegion(zone.id);
                  setSidebarTab("properties");
                }}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      {zone.name}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {linkedMarkups.length} linked items
                    </div>
                  </div>

                  <div
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: zone.color }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Size</div>
                    <div className="mt-1 text-zinc-200">
                      {Math.round(zone.bounds.width)} × {Math.round(zone.bounds.height)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Page</div>
                    <div className="mt-1 text-zinc-200">
                      {zone.pageIndex + 1}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Categories</div>
                    <div className="mt-1 text-zinc-200">
                      {categories.length ? categories.join(", ") : "-"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Suppliers</div>
                    <div className="mt-1 text-zinc-200">
                      {suppliers.length ? suppliers.join(", ") : "-"}
                    </div>
                  </div>
                </div>

                {zone.notes ? (
                  <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-xs text-zinc-300">
                    {zone.notes}
                  </div>
                ) : null}
              </button>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    selectRegion(zone.id);
                    setSidebarTab("takeoffs");
                  }}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-600"
                >
                  Open Takeoff
                </button>

                <button
                  type="button"
                  onClick={() => {
                    selectRegion(zone.id);
                    setSidebarTab("qr");
                  }}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-600"
                >
                  Open QR
                </button>

                <button
                  type="button"
                  onClick={() => deleteRegion(zone.id)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}