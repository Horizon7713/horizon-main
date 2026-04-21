import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderParameters,
} from 'pdfjs-dist/types/src/display/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

export async function loadPdfDocument(source: Uint8Array): Promise<PDFDocumentProxy> {
  if (!source || source.length === 0) {
    throw new Error('No PDF binary data was provided.')
  }

  const task = pdfjsLib.getDocument({
    data: source,
    useWorkerFetch: false,
    isEvalSupported: false,
  })

  return await task.promise
}

export function getPdfPageCount(doc: PDFDocumentProxy): number {
  return doc.numPages
}

export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  zoom: number,
) {
  const viewport = page.getViewport({ scale: zoom })
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not get 2D canvas context.')
  }

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  const renderContext: RenderParameters = {
    canvasContext: context,
    viewport,
  }

  const renderTask = page.render(renderContext)
  await renderTask.promise

  return viewport
}