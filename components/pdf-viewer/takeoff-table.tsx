"use client";

import React, { useMemo, useState } from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";
import {
  buildTakeoffRows,
  filterTakeoffsByCategory,
  filterTakeoffsByRegion,
  groupTakeoffsByCategory,
  groupTakeoffsBySupplier,
} from "@/lib/takeoff-utils";
import type { MaterialCategory } from "@/lib/pdf-viewer-types";

const CATEGORY_OPTIONS: Array<MaterialCategory | "all"> = [
  "all",
  "lumber",
  "steel",
  "hardware",
  "cabinets",
  "tile",
  "finishes",
  "concrete",
  "roofing",
  "electrical",
  "plumbing",
  "hvac",
  "other",
];

export function TakeoffTable() {
  const { state } = usePdfViewer();
  const [groupMode, setGroupMode] = useState<"category" | "supplier">("category");
  const [categoryFilter, setCategoryFilter] =
    useState<MaterialCategory | "all">("all");

  const rows = useMemo(
    () => buildTakeoffRows(state.markups, state.regions),
    [state.markups, state.regions]
  );

  const filteredRows = useMemo(() => {
    const byRegion = filterTakeoffsByRegion(
      rows,
      state.selection.selectedRegionId
    );
    return filterTakeoffsByCategory(byRegion, categoryFilter);
  }, [rows, state.selection.selectedRegionId, categoryFilter]);

  const groups = useMemo(() => {
    return groupMode === "category"
      ? groupTakeoffsByCategory(filteredRows)
      : groupTakeoffsBySupplier(filteredRows);
  }, [filteredRows, groupMode]);

  const selectedRegion = state.regions.find(
    (r) => r.id === state.selection.selectedRegionId
  );

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Takeoff Output
        </div>
        <div className="mt-1 text-sm text-zinc-300">
          {selectedRegion
            ? `Scoped to region: ${selectedRegion.name}`
            : "Showing all regions"}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Group By</label>
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as "category" | "supplier")}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="category">Category</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Category Filter</label>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as MaterialCategory | "all")
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
          No takeoff rows yet. Add material data to markups to populate this panel.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.key}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {group.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {group.rows.length} items
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">
                  Total Qty: {group.totalQuantity}
                </div>
              </div>

              <div className="divide-y divide-zinc-800">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-6 gap-3 px-4 py-3 text-sm"
                  >
                    <div className="col-span-2">
                      <div className="font-medium text-zinc-100">
                        {row.materialName}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {row.subject || "Untitled"} · Page {row.pageIndex + 1}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-400">Region</div>
                      <div className="mt-1 text-zinc-200">{row.regionName ?? "-"}</div>
                    </div>

                    <div>
                      <div className="text-zinc-400">Qty</div>
                      <div className="mt-1 text-zinc-200">
                        {row.quantity} {row.unit ?? ""}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-400">Supplier</div>
                      <div className="mt-1 text-zinc-200">{row.supplier ?? "-"}</div>
                    </div>

                    <div>
                      <div className="text-zinc-400">Trade</div>
                      <div className="mt-1 text-zinc-200">{row.trade ?? "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}