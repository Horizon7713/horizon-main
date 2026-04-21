import type {
  MaterialCategory,
  PdfMarkup,
  PlanRegion,
  QrPayload,
} from "./pdf-viewer-types";

interface BuildQrPayloadOptions {
  projectName: string;
  regions: PlanRegion[];
  markups: PdfMarkup[];
  regionId?: string;
  category?: MaterialCategory;
  supplier?: string;
  title: string;
  description?: string;
}

export function buildQrPayload({
  projectName,
  regions,
  markups,
  regionId,
  category,
  supplier,
  title,
  description,
}: BuildQrPayloadOptions): QrPayload {
  const filtered = markups.filter((markup) => {
    if (!markup.material?.materialName) return false;
    if (regionId && markup.regionId !== regionId) return false;
    if (category && markup.material?.category !== category) return false;
    if (supplier && markup.material?.supplier !== supplier) return false;
    return true;
  });

  return {
    id: crypto.randomUUID(),
    projectName,
    version: "1.0.0",
    regionId,
    category,
    supplier,
    title,
    description,
    generatedAt: new Date().toISOString(),
    materials: filtered.map((markup) => {
      const region = regions.find((r) => r.id === markup.regionId);

      return {
        markupId: markup.id,
        regionName: region?.name,
        category: markup.material?.category ?? "other",
        materialName: markup.material?.materialName ?? "Unnamed Material",
        materialCode: markup.material?.materialCode,
        quantity: markup.material?.quantity,
        unit: markup.material?.unit,
        supplier: markup.material?.supplier,
        trade: markup.material?.trade,
        notes: markup.material?.notes,
      };
    }),
  };
}

export function serializeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildQrDataUrl(payload: QrPayload): string {
  const json = serializeQrPayload(payload);
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
}