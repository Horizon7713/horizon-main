"use client";

import React from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";
import type { MaterialCategory } from "@/lib/pdf-viewer-types";

const CATEGORY_OPTIONS: MaterialCategory[] = [
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

export function PropertiesPanel() {
  const {
    state,
    updateMarkup,
    updateRegion,
  } = usePdfViewer();

  const selectedMarkup = state.markups.find(
    (m) => m.id === state.selection.selectedMarkupIds[0]
  );

  const selectedZone = state.regions.find(
    (r) => r.id === state.selection.selectedRegionId
  );

  if (!selectedMarkup && !selectedZone) {
    return (
      <div className="p-4 text-sm text-zinc-400">
        Select a scope zone or takeoff item to edit its data.
      </div>
    );
  }

  if (selectedZone) {
    const linkedMarkups = state.markups.filter(
      (markup) => markup.regionId === selectedZone.id
    );

    return (
      <div className="space-y-5 p-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Scope Zone
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {selectedZone.name}
          </div>
        </div>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Zone Identity
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Zone Name</label>
            <input
              type="text"
              value={selectedZone.name}
              onChange={(e) =>
                updateRegion({
                  ...selectedZone,
                  name: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Kitchen, Living Room, Garage, Roof West..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Zone Notes</label>
            <textarea
              value={selectedZone.notes ?? ""}
              onChange={(e) =>
                updateRegion({
                  ...selectedZone,
                  notes: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              className="min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Describe the package or intended scope for this zone"
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Package Summary
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs text-zinc-500">Linked Items</div>
              <div className="mt-1 font-semibold text-zinc-100">
                {linkedMarkups.length}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs text-zinc-500">Page</div>
              <div className="mt-1 font-semibold text-zinc-100">
                {selectedZone.pageIndex + 1}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs text-zinc-500">Width</div>
              <div className="mt-1 font-semibold text-zinc-100">
                {Math.round(selectedZone.bounds.width)}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs text-zinc-500">Height</div>
              <div className="mt-1 font-semibold text-zinc-100">
                {Math.round(selectedZone.bounds.height)}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            What this zone does
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
            This Scope Zone groups takeoff items into one package that can feed:
            spreadsheets, supplier-specific takeoff sheets, and QR output for
            field use or owner handoff.
          </div>
        </section>
      </div>
    );
  }

  if (!selectedMarkup) return null;

  const handleRootFieldChange = (
    key: "subject" | "comment" | "regionId",
    value: string
  ) => {
    updateMarkup({
      ...selectedMarkup,
      [key]: value || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleStyleChange = (
    key: "strokeColor" | "fillColor" | "strokeWidth" | "opacity" | "textColor" | "fontSize",
    value: string | number
  ) => {
    updateMarkup({
      ...selectedMarkup,
      style: {
        ...selectedMarkup.style,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMaterialChange = (
    key:
      | "category"
      | "materialName"
      | "materialCode"
      | "quantity"
      | "unit"
      | "supplier"
      | "trade"
      | "notes",
    value: string | number
  ) => {
    updateMarkup({
      ...selectedMarkup,
      material: {
        category: selectedMarkup.material?.category ?? "other",
        materialName: selectedMarkup.material?.materialName ?? "",
        ...selectedMarkup.material,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const supportsFill = ["rectangle", "highlight", "ellipse", "cloud"].includes(
    selectedMarkup.type
  );

  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Takeoff Item
        </div>
        <div className="mt-1 text-lg font-semibold text-zinc-100">
          {selectedMarkup.subject || selectedMarkup.type}
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Item Identity
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Item Name</label>
          <input
            type="text"
            value={selectedMarkup.subject ?? ""}
            onChange={(e) => handleRootFieldChange("subject", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Kitchen Wall Framing, H1 Hardware Package..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Comment</label>
          <textarea
            value={selectedMarkup.comment ?? ""}
            onChange={(e) => handleRootFieldChange("comment", e.target.value)}
            className="min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Scope Zone</label>
          <select
            value={selectedMarkup.regionId ?? ""}
            onChange={(e) => handleRootFieldChange("regionId", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Unassigned</option>
            {state.regions
              .filter((region) => region.pageIndex === selectedMarkup.pageIndex)
              .map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Spreadsheet / Package Data
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Category</label>
          <select
            value={selectedMarkup.material?.category ?? "other"}
            onChange={(e) =>
              handleMaterialChange("category", e.target.value as MaterialCategory)
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
          <label className="mb-1 block text-xs text-zinc-500">Material / Item</label>
          <input
            type="text"
            value={selectedMarkup.material?.materialName ?? ""}
            onChange={(e) => handleMaterialChange("materialName", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="2x6 DF #2, H1 tie, white oak cabinet package..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Quantity</label>
            <input
              type="number"
              value={selectedMarkup.material?.quantity ?? ""}
              onChange={(e) =>
                handleMaterialChange(
                  "quantity",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Unit</label>
            <input
              type="text"
              value={selectedMarkup.material?.unit ?? ""}
              onChange={(e) => handleMaterialChange("unit", e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="ea, lf, sf, set, box"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Supplier</label>
          <input
            type="text"
            value={selectedMarkup.material?.supplier ?? ""}
            onChange={(e) => handleMaterialChange("supplier", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="ABC Lumber, steel yard, cabinet shop..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Trade</label>
          <input
            type="text"
            value={selectedMarkup.material?.trade ?? ""}
            onChange={(e) => handleMaterialChange("trade", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Framing, Hardware, Cabinets, Tile..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Code / SKU</label>
          <input
            type="text"
            value={selectedMarkup.material?.materialCode ?? ""}
            onChange={(e) => handleMaterialChange("materialCode", e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Package Notes</label>
          <textarea
            value={selectedMarkup.material?.notes ?? ""}
            onChange={(e) => handleMaterialChange("notes", e.target.value)}
            className="min-h-20 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Visual Style
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Stroke Color</label>
          <input
            type="color"
            value={selectedMarkup.style.strokeColor}
            onChange={(e) => handleStyleChange("strokeColor", e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950"
          />
        </div>

        {supportsFill ? (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Fill Color</label>
            <input
              type="color"
              value={selectedMarkup.style.fillColor ?? "#ffffff"}
              onChange={(e) => handleStyleChange("fillColor", e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Stroke Width</label>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={selectedMarkup.style.strokeWidth}
              onChange={(e) =>
                handleStyleChange("strokeWidth", Number(e.target.value))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Opacity</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={selectedMarkup.style.opacity}
              onChange={(e) =>
                handleStyleChange("opacity", Number(e.target.value))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
