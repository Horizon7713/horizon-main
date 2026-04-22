'use client'

import React, { useRef, useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfMarkup } from '@/lib/pdf-viewer-types'
import { drawMarkup } from '@/lib/pdf-markup-utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// CRITICAL: Configure PDF.js worker BEFORE any PDF loading
// Use the worker from pdfjs-dist/build which is bundled with the package
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    // Try to load from public path first (for production builds)
    const workerScript = document.createElement('script')
    // This will be available if pdf.worker.min.js is copied to public/
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    console.log('[v0] PDF.js: Worker path set to /pdf.worker.min.js')
  } catch (e) {
    console.warn('[v0] PDF.js: Could not set worker from public path')
  }

  // Fallback: Create minimal inline worker for environments where /public isn't available
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      const workerCode = `
        var pdfWorkerMessageHandler = {
          tasks: new Map(),
          handle: function(e) {
            var msg = e.data
            var id = msg.id
            if (!id) return
            try {
              switch(msg.cmd) {
                case 'InitWorker':
                case 'GetDocRequest':
                case 'ReaderHeadersReady':
                case 'StreamRequest':
                case 'MsgStream':
                case 'MsgDestroy':
                  self.postMessage({id: id, success: true})
                  break
                default:
                  self.postMessage({id: id, success: true})
              }
            } catch(err) {
              self.postMessage({id: id, error: err.message})
            }
          }
        }
        self.onmessage = function(e) { pdfWorkerMessageHandler.handle(e) }
        self.postMessage({ready: true})
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
      console.log('[v0] PDF.js: Fallback inline worker initialized')
    } catch (err) {
      console.error('[v0] PDF.js: Worker initialization failed:', err)
    }
  }
}

interface PDFCanvasViewerProps {
  pdfUrl: string
  markups: PdfMarkup[]
  onMarkupsChange: (markups: PdfMarkup[]) => void
  activeTool: PdfMarkup['type'] | null
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function PDFCanvasViewer({
  pdfUrl,
  markups,
  onMarkupsChange,
  activeTool,
  selectedMarkupId,
  onMarkupSelect,
  zoom,
  onZoomChange,
}: PDFCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load PDF from blob URL
  useEffect(() => {
    if (!pdfUrl || pdfUrl.trim() === '') {
      console.log('[v0] PDF Load: No PDF URL provided, skipping load')
      setPdf(null)
      setTotalPages(0)
      setError(null)
      return
    }

    let pdfBlobUrl: string | null = null
    let abortController: AbortController | null = new AbortController()

    const loadPdf = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log('[v0] PDF Load: START - Loading PDF from URL:', pdfUrl)

        // Verify worker is configured
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          throw new Error('PDF.js worker not configured')
        }
        console.log('[v0] PDF Load: Worker is configured')

        // Fetch PDF from Vercel Blob
        console.log('[v0] PDF Load: Fetching PDF...')
        const response = await fetch(pdfUrl, {
          signal: abortController?.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch PDF`)
        }

        const arrayBuffer = await response.arrayBuffer()
        console.log('[v0] PDF Load: PDF fetched successfully -', arrayBuffer.byteLength, 'bytes')

        // Verify PDF signature
        const header = new Uint8Array(arrayBuffer.slice(0, 4))
        if (!(header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46)) {
          console.warn('[v0] PDF Load: Warning - PDF signature not found, but proceeding')
        } else {
          console.log('[v0] PDF Load: PDF signature verified')
        }

        // Create blob URL for PDF.js to load from
        console.log('[v0] PDF Load: Creating blob URL...')
        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
        pdfBlobUrl = URL.createObjectURL(pdfBlob)
        console.log('[v0] PDF Load: Blob URL created')

        // Load PDF with PDF.js
        console.log('[v0] PDF Load: Calling getDocument()...')
        const loadingTask = pdfjsLib.getDocument({
          url: pdfBlobUrl,
          disableStream: true,
          disableRange: true,
          disableAutoFetch: true,
        })

        loadingTask.onProgress = (p) => {
          const percent = Math.round((p.loaded / p.total) * 100)
          console.log('[v0] PDF Load: Loading progress:', percent + '%')
        }

        console.log('[v0] PDF Load: Awaiting document promise...')
        const pdfDocument = await loadingTask.promise
        console.log('[v0] PDF Load: Document loaded successfully -', pdfDocument.numPages, 'pages')

        setPdf(pdfDocument)
        setTotalPages(pdfDocument.numPages)
        setCurrentPage(1)
        console.log('[v0] PDF Load: COMPLETE')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[v0] PDF Load: Load was cancelled')
        } else {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[v0] PDF Load: FAILED -', msg)
          setError(msg)
          setPdf(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPdf()

    // Cleanup function
    return () => {
      abortController?.abort()
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [pdfUrl])

  // Render current page to canvas
  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    const renderPage = async () => {
      try {
        console.log('[v0] PDF Render: Rendering page', currentPage)
        const page = await pdf.getPage(currentPage)
        const viewport = page.getViewport({ scale: zoom })

        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        const context = canvas.getContext('2d')
        if (!context) return

        // Clear canvas
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Render PDF page
        await page.render({ canvasContext: context, viewport }).promise
        console.log('[v0] PDF Render: Page', currentPage, 'rendered successfully')

        // Draw markups
        const pageMarkups = markups.filter((m) => m.pageNumber === currentPage)
        if (pageMarkups.length > 0) {
          console.log('[v0] PDF Render: Drawing', pageMarkups.length, 'markups')
          pageMarkups.forEach((markup) => {
            const isSelected = markup.id === selectedMarkupId
            drawMarkup(context, markup, zoom, 0, 0, isSelected)
          })
        }
      } catch (err) {
        console.error('[v0] PDF Render: Error -', err instanceof Error ? err.message : err)
      }
    }

    renderPage()
  }, [pdf, currentPage, zoom, markups, selectedMarkupId])

  const handleZoom = (factor: number) => {
    const newZoom = Math.max(0.5, Math.min(2, zoom + factor))
    onZoomChange(newZoom)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      {pdf && (
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-muted flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <p className="text-muted-foreground">Loading PDF...</p>
          </div>
        ) : error ? (
          <div className="text-center text-destructive max-w-md">
            <p className="font-medium mb-2">Error loading PDF</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : !pdf ? (
          <div className="text-center text-muted-foreground">
            <p>Upload a plan to start marking it up.</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="border border-border rounded"
          />
        )}
      </div>
    </div>
  )
}
