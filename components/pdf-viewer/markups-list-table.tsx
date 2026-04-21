"use client";

import React, { useMemo } from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";

export function MarkupsListTable() {
  const { state, selectMarkup, deleteMarkup } = usePdfViewer();

  const markups = Array.isArray(state.markups) ? state.markups : [];

  const rows = useMemo(() => {
    return [...markups]
      .sort((a, b) => {
        if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
        return a.createdAt.localeCompare(b.createdAt);
      })
      .map((markup) => {
        const region = state.regions.find((r) => r.id === markup.regionId);

        return {
          ...markup,
          regionName: region?.name ?? "-",
          category: markup.material?.category ?? "-",
          materialName: markup.material?.materialName ?? "-",
          quantity:
            markup.material?.quantity !== undefined
              ? `${markup.material.quantity}${markup.material.unit ? ` ${markup.material.unit}` : ""}`
              : "-",
          supplier: markup.material?.supplier ?? "-",
        };
      });
  }, [markups, state.regions]);

  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-400">
        No markups yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Markup Register
      </div>

      <div className="space-y-2">
        {rows.map((markup) => {
          const isSelected = state.selection.selectedMarkupIds.includes(markup.id);

          return (
            <div
              key={markup.id}
              className={[
                "rounded-xl border p-3 transition",
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700",
              ].join(" ")}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => selectMarkup(markup.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      {markup.subject || markup.type}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Page {markup.pageIndex + 1} · Region: {markup.regionName}
                    </div>
                  </div>

                  <div className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300">
                    {markup.type}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Category</div>
                    <div className="mt-1 text-zinc-200">{markup.category}</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Material</div>
                    <div className="mt-1 text-zinc-200">{markup.materialName}</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Qty</div>
                    <div className="mt-1 text-zinc-200">{markup.quantity}</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-zinc-500">Supplier</div>
                    <div className="mt-1 text-zinc-200">{markup.supplier}</div>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300"
                  onClick={() => deleteMarkup(markup.id)}
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
