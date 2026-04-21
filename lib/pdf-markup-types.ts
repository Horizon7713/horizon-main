import type { PdfMarkup } from "./pdf-viewer-types";

export type Markup = PdfMarkup;

export interface MarkupCreateInput {
  type: PdfMarkup["type"];
  pageIndex: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
}

export interface MarkupSummaryRow {
  id: string;
  type: string;
  pageIndex: number;
  subject?: string;
  comment?: string;
  measurementValue?: number;
  measurementUnit?: string;
  createdAt: string;
}