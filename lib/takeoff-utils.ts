import type {
  MaterialCategory,
  PdfMarkup,
  PlanRegion,
} from "./pdf-viewer-types";

export interface TakeoffRow {
  id: string;
  markupId: string;
  pageIndex: number;
  regionId?: string;
  regionName?: string;
  category: MaterialCategory;
  materialName: string;
  materialCode?: string;
  quantity: number;
  unit?: string;
  supplier?: string;
  trade?: string;
  notes?: string;
  subject?: string;
}

export interface TakeoffGroup {
  key: string;
  label: string;
  rows: TakeoffRow[];
  totalQuantity: number;
}

function normalizeQuantity(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function buildTakeoffRows(
  markups: PdfMarkup[],
  regions: PlanRegion[]
): TakeoffRow[] {
  return markups
    .filter((markup) => !!markup.material?.materialName)
    .map((markup) => {
      const region = regions.find((r) => r.id === markup.regionId);

      return {
        id: `${markup.id}:${markup.material?.category ?? "other"}:${markup.material?.supplier ?? "unassigned"}`,
        markupId: markup.id,
        pageIndex: markup.pageIndex,
        regionId: markup.regionId,
        regionName: region?.name,
        category: markup.material?.category ?? "other",
        materialName: markup.material?.materialName ?? "Unnamed Material",
        materialCode: markup.material?.materialCode,
        quantity: normalizeQuantity(markup.material?.quantity),
        unit: markup.material?.unit,
        supplier: markup.material?.supplier,
        trade: markup.material?.trade,
        notes: markup.material?.notes,
        subject: markup.subject,
      };
    });
}

export function groupTakeoffsByCategory(rows: TakeoffRow[]): TakeoffGroup[] {
  const map = new Map<string, TakeoffRow[]>();

  for (const row of rows) {
    const key = row.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return Array.from(map.entries())
    .map(([key, groupedRows]) => ({
      key,
      label: key,
      rows: groupedRows.sort((a, b) => a.materialName.localeCompare(b.materialName)),
      totalQuantity: groupedRows.reduce((sum, row) => sum + row.quantity, 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function groupTakeoffsBySupplier(rows: TakeoffRow[]): TakeoffGroup[] {
  const map = new Map<string, TakeoffRow[]>();

  for (const row of rows) {
    const key = row.supplier?.trim() || "Unassigned Supplier";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return Array.from(map.entries())
    .map(([key, groupedRows]) => ({
      key,
      label: key,
      rows: groupedRows.sort((a, b) => a.materialName.localeCompare(b.materialName)),
      totalQuantity: groupedRows.reduce((sum, row) => sum + row.quantity, 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterTakeoffsByRegion(
  rows: TakeoffRow[],
  regionId?: string
): TakeoffRow[] {
  if (!regionId) return rows;
  return rows.filter((row) => row.regionId === regionId);
}

export function filterTakeoffsByCategory(
  rows: TakeoffRow[],
  category?: MaterialCategory | "all"
): TakeoffRow[] {
  if (!category || category === "all") return rows;
  return rows.filter((row) => row.category === category);
}