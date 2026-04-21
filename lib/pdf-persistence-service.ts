import { supabase } from "@/lib/supabaseClient";
import type { PdfMarkup, PlanRegion, Point, Rect } from "@/lib/pdf-viewer-types";

type DbMarkupRow = {
  id: string;
  pdf_file_id: string;
  page_number: number;
  markup_type: string;
  markup_data: any;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  parent_markup_id: string | null;
  zone_name: string | null;
  trade: string | null;
  material_category: string | null;
  supplier: string | null;
  package_name: string | null;
  quantity: number | null;
  unit: string | null;
  area_sq_ft: number | null;
};

export async function getCurrentUserId(optional = false): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (optional) return null;
    throw error;
  }

  const userId = data.user?.id ?? null;

  if (!userId) {
    if (optional) return null;
    throw new Error("No authenticated user found.");
  }

  return userId;
}

export async function createPdfFileRecord(input: {
  projectId?: string | null;
  fileName: string;
  filePath: string;
  fileSizeBytes?: number | null;
  pageCount?: number | null;
}) {
  const userId = await getCurrentUserId(true);

  const { data, error } = await supabase
    .from("pdf_files")
    .insert({
      project_id: input.projectId ?? null,
      file_name: input.fileName,
      file_path: input.filePath,
      file_size_bytes: input.fileSizeBytes ?? null,
      page_count: input.pageCount ?? null,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function rectFromPoints(points: Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

export function regionToDbMarkup(pdfFileId: string, userId: string, region: PlanRegion) {
  return {
    id: region.id,
    pdf_file_id: pdfFileId,
    page_number: region.pageIndex + 1,
    markup_type: "scope_zone",
    markup_data: {
      shape_type: region.type,
      bounds: region.bounds,
      points: region.points ?? null,
      color: region.color,
      area_sq_ft: region.areaSqFt ?? null,
      notes: region.notes ?? null,
      category_defaults: region.categoryDefaults ?? [],
      supplier_defaults: region.supplierDefaults ?? [],
      trade_tags: region.tradeTags ?? [],
      page_space: true,
    },
    created_by: userId,
    parent_markup_id: null,
    zone_name: region.name,
    trade: null,
    material_category: null,
    supplier: null,
    package_name: null,
    quantity: null,
    unit: null,
    area_sq_ft: region.areaSqFt ?? null,
  };
}

export function markupToDbMarkup(pdfFileId: string, userId: string, markup: PdfMarkup) {
  return {
    id: markup.id,
    pdf_file_id: pdfFileId,
    page_number: markup.pageIndex + 1,
    markup_type: markup.type === "rectangle" ? "takeoff_item" : markup.type,
    markup_data: {
      ...markup,
      page_space: true,
    },
    created_by: userId,
    parent_markup_id: markup.regionId ?? null,
    zone_name: null,
    trade: markup.material?.trade ?? null,
    material_category: markup.material?.category ?? null,
    supplier: markup.material?.supplier ?? null,
    package_name: markup.subject ?? null,
    quantity: markup.material?.quantity ?? null,
    unit: markup.material?.unit ?? null,
    area_sq_ft: null,
  };
}

export function dbRowToRegion(row: DbMarkupRow): PlanRegion | null {
  if (row.markup_type !== "scope_zone") return null;

  return {
    id: row.id,
    pageIndex: row.page_number - 1,
    name: row.zone_name ?? "Scope Zone",
    type: row.markup_data?.shape_type === "polygon" ? "polygon" : "rectangle",
    bounds: row.markup_data?.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
    points: row.markup_data?.points ?? undefined,
    color: row.markup_data?.color ?? "#22c55e",
    areaSqFt: row.area_sq_ft ?? row.markup_data?.area_sq_ft ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    tradeTags: row.markup_data?.trade_tags ?? [],
    categoryDefaults: row.markup_data?.category_defaults ?? [],
    supplierDefaults: row.markup_data?.supplier_defaults ?? [],
    notes: row.markup_data?.notes ?? "",
  };
}

export function dbRowToMarkup(row: DbMarkupRow): PdfMarkup | null {
  if (row.markup_type === "scope_zone") return null;

  const data = row.markup_data ?? {};
  return {
    ...data,
    id: row.id,
    pageIndex: row.page_number - 1,
    regionId: row.parent_markup_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    material: data.material ?? {
      category: row.material_category ?? "other",
      materialName: data.material?.materialName ?? "",
      quantity: row.quantity ?? undefined,
      unit: row.unit ?? undefined,
      supplier: row.supplier ?? undefined,
      trade: row.trade ?? undefined,
    },
  } as PdfMarkup;
}

export async function loadPdfMarkups(pdfFileId: string) {
  const { data, error } = await supabase
    .from("pdf_markups")
    .select("*")
    .eq("pdf_file_id", pdfFileId)
    .order("page_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadPdfMarkups Supabase error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return {
      regions: [],
      markups: [],
    };
  }

  const rows = (data ?? []) as DbMarkupRow[];

  return {
    regions: rows.map(dbRowToRegion).filter(Boolean) as PlanRegion[],
    markups: rows.map(dbRowToMarkup).filter(Boolean) as PdfMarkup[],
  };
}

export async function saveRegion(pdfFileId: string, region: PlanRegion) {
  const userId = await getCurrentUserId(false);
  if (!userId) throw new Error("No authenticated user found.");

  const payload = regionToDbMarkup(pdfFileId, userId, region);

  const { error } = await supabase.from("pdf_markups").upsert(payload);
  if (error) throw error;
}

export async function saveMarkup(pdfFileId: string, markup: PdfMarkup) {
  const userId = await getCurrentUserId(false);
  if (!userId) throw new Error("No authenticated user found.");

  const payload = markupToDbMarkup(pdfFileId, userId, markup);

  const { error } = await supabase.from("pdf_markups").upsert(payload);
  if (error) throw error;
}

export async function deletePersistedMarkup(markupId: string) {
  const { error } = await supabase.from("pdf_markups").delete().eq("id", markupId);
  if (error) throw error;
}

export function buildPolygonRegion(input: {
  id?: string;
  pageIndex: number;
  name: string;
  points: Point[];
  color?: string;
  notes?: string;
}) {
  const bounds = rectFromPoints(input.points);
  const rawArea = polygonArea(input.points);

  return {
    id: input.id ?? crypto.randomUUID(),
    pageIndex: input.pageIndex,
    name: input.name,
    type: "polygon" as const,
    points: input.points,
    bounds,
    color: input.color ?? "#22c55e",
    areaSqFt: rawArea,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: input.notes ?? "",
    tradeTags: [],
    categoryDefaults: [],
    supplierDefaults: [],
  };
}