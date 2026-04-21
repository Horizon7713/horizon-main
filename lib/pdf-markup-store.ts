import type { PdfMarkup } from "./pdf-viewer-types";

export function getMarkupsForPage(markups: PdfMarkup[], pageIndex: number) {
  return markups.filter((markup) => markup.pageIndex === pageIndex);
}

export function getMarkupById(markups: PdfMarkup[], markupId?: string) {
  if (!markupId) return undefined;
  return markups.find((markup) => markup.id === markupId);
}