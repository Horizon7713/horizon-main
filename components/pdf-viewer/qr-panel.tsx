"use client";

import React, { useMemo, useState } from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";
import { buildQrPayload, serializeQrPayload } from "@/lib/qr-payload-utils";
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

export function QrPanel() {
  const { state, setQrPayloads } = usePdfViewer();
  const [categoryFilter, setCategoryFilter] =
    useState<MaterialCategory | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const selectedRegion = state.regions.find(
    (r) => r.id === state.selection.selectedRegionId
  );

  const supplierOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        state.markups
          .map((markup) => markup.material?.supplier)
          .filter((value): value is string => !!value)
      )
    ).sort();
    return values;
  }, [state.markups]);

  const payload = useMemo(() => {
    const built = buildQrPayload({
      projectName: state.document.projectName,
      regions: state.regions,
      markups: state.markups,
      regionId: selectedRegion?.id,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      supplier: supplierFilter === "all" ? undefined : supplierFilter,
      title: [
        state.document.projectName,
        selectedRegion?.name,
        categoryFilter !== "all" ? categoryFilter : undefined,
        supplierFilter !== "all" ? supplierFilter : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      description:
        "Field QR payload for materials, suppliers, and homeowner-facing project data.",
    });

    return built;
  }, [
    state.document.projectName,
    state.regions,
    state.markups,
    selectedRegion,
    categoryFilter,
    supplierFilter,
  ]);

  const payloadText = useMemo(() => serializeQrPayload(payload), [payload]);

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      payloadText
    )}`;
  }, [payloadText]);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          QR Output
        </div>
        <div className="mt-1 text-sm text-zinc-300">
          Build a scannable QR for the selected region, category, or supplier package.
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3">
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

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Supplier Filter</label>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="all">all</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center">
            <img
              src={qrImageUrl}
              alt="Generated QR code"
              className="h-[260px] w-[260px] rounded-xl border border-zinc-800 bg-white p-2"
            />

            <button
              type="button"
              onClick={() => setQrPayloads([payload, ...state.qrPayloads])}
              className="mt-4 rounded-xl border border-blue-500 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/25"
            >
              Save QR Payload Snapshot
            </button>
          </div>

          <div className="min-w-0">
            <div className="mb-2 text-sm font-semibold text-zinc-100">
              {payload.title}
            </div>

            <div className="mb-3 text-xs text-zinc-500">
              {payload.materials.length} material rows included
            </div>

            <textarea
              readOnly
              value={payloadText}
              className="min-h-[320px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-xs text-zinc-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}