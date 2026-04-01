'use client'

/**
 * Production-Grade PDF Plan Viewer
 * 
 * Integrated features:
 * - Real-time collaboration with WebSocket sync
 * - Comprehensive state management
 * - Performance optimization for large PDFs
 * - Advanced markup tools with measurements
 * - Version history and audit trails
 * - Multi-user presence awareness
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ToolRail } from '@/components/pdf-viewer/tool-rail'
import { PDFCanvasViewer } from '@/components/pdf-viewer/pdf-canvas-viewer'
import { ResizableSidebar } from '@/components/pdf-viewer/resizable-sidebar'
import { MarkupsListTable } from '@/components/pdf-viewer/markups-list-table'
import { ScaleCalibrationDialog } from '@/components/pdf-viewer/scale-calibration-dialog'
import { SidebarPanel, PropertiesPanelContent } from '@/components/pdf-viewer/sidebar-panels'
import { PDFViewerProvider, usePDFViewer } from '@/lib/pdf-viewer-context'
import { usePresence } from '@/hooks/usePresence'
import { Markup, MarkupType, PageScale } from '@/lib/pdf-viewer-types'
import { buildPageScale, upsertPageScale } from '@/lib/pdf-calibration-utils'
import { getPageInchesPerPixel } from '@/lib/pdf-measurement-utils'
import { Button } from '@/components/ui/button'
import { FileUp, Settings2, Users, Loader2 } from 'lucide-react'
import { savePdfMarkupToDatabase } from './actions'
import { useDocumentState } from '@/hooks/useDocumentState'

/**
 * Main PlanViewerPage Component
 * Orchestrates all PDF viewer functionality
 */
function PlanViewerContent() {
  const { state, dispatch } = usePDFViewer()
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false)
  const [calibrationPixelDistance, setCalibrationPixelDistance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)

  // TODO: replace with real auth user id once auth is wired
  const currentUserId = 'user-123'
  const currentUserName = 'Current User'

  // ---------------------------------------------------------------
  // Event-sourced document state: snapshot + replay + realtime + undo
  // ---------------------------------------------------------------
  const docState = useDocumentState(documentId)
  const presence = usePresence(documentId, currentUserId, currentUserName)

  // Sync presence page/zoom changes (stable ref — updatePresence has [] deps)
  const updatePresenceRef = useRef(presence.updatePresence)
  updatePresenceRef.current = presence.updatePresence

  useEffect(() => {
    updatePresenceRef.current({ currentPage: state.currentPage, zoom: state.zoom })
  }, [state.currentPage, state.zoom])

  // Sync event-sourced state into the context reducer.
  // Use refs to avoid re-entrancy: only dispatch when the hook's array
  // reference actually changes (useMemo inside the hook guarantees this).
  const prevSyncedMarkups = useRef<Markup[]>([])
  const prevSyncedScales = useRef<PageScale[]>([])

  useEffect(() => {
    if (docState.markups !== prevSyncedMarkups.current) {
      prevSyncedMarkups.current = docState.markups
      dispatch({ type: 'SET_MARKUPS', payload: docState.markups })
    }
  }, [docState.markups, dispatch])

  useEffect(() => {
    if (docState.pageScales !== prevSyncedScales.current) {
      prevSyncedScales.current = docState.pageScales
      for (const scale of docState.pageScales) {
        dispatch({ type: 'SET_PAGE_SCALE', payload: scale })
      }
    }
  }, [docState.pageScales, dispatch])

  // ---------------------------------------------------------------
  // Keyboard: Ctrl+Z / Ctrl+Shift+Z — use refs for stable handler
  // ---------------------------------------------------------------
  const docStateRef = useRef(docState)
  docStateRef.current = docState

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        docStateRef.current.undo()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        docStateRef.current.redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleMarkupSelect = useCallback((markupId: string | null) => {
    dispatch({ type: 'SELECT_MARKUP', payload: markupId })
  }, [dispatch])

  const handleMarkupsChange = useCallback((newMarkups: Markup[]) => {
    const ds = docStateRef.current
    const currentById = new Map(ds.markups.map((m) => [m.id, m]))
    const nextById = new Map(newMarkups.map((m) => [m.id, m]))

    for (const m of newMarkups) {
      if (!currentById.has(m.id)) {
        ds.addMarkup(m)
      } else if (currentById.get(m.id)!.updatedAt !== m.updatedAt) {
        ds.editMarkup(m)
      }
    }
    for (const m of ds.markups) {
      if (!nextById.has(m.id)) {
        ds.removeMarkup(m.id, m.pageNumber)
      }
    }
  }, [])

  const handleCalibrate = useCallback((pixelDistance: number) => {
    setCalibrationPixelDistance(pixelDistance)
    setScaleDialogOpen(true)
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' })
  }, [dispatch])

  const handleScaleSet = useCallback(async (scale: PageScale) => {
    dispatch({
      type: 'SET_DRAWING_SCALE',
      payload: {
        pixelDistance: 0,
        realWorldDistance: 0,
        unit: 'ft',
        inchesPerPixel: scale.inchesPerPixel,
      },
    })
    await docStateRef.current.setPageScale(scale)
  }, [dispatch])

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      setUploadError(null)

      // Stream file directly to Blob (avoids body-size limits with FormData)
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'content-type': file.type || 'application/pdf',
          'x-filename': encodeURIComponent(file.name),
          'content-length': String(file.size),
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      const blobUrl = uploadData.url

      // Save metadata to database
      const result = await savePdfMarkupToDatabase({
        fileName: file.name,
        fileSize: file.size,
        blobUrl,
        uploadTimestamp: new Date().toISOString(),
      })

      if (!result.success) {
        throw new Error(result.error || 'Database save failed')
      }

      // Update state
      setPdfUrl(blobUrl)
      dispatch({ type: 'SET_MARKUPS', payload: [] })
      dispatch({ type: 'SELECT_MARKUP', payload: null })

      // Store the PDF file ID from pdf_files table
      if (result.data?.id) {
        setDocumentId(String(result.data.id))
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const selectedMarkup = state.markups.find((m) => m.id === state.selectedMarkupId) || null

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Error Banner */}
      {uploadError && (
        <div className="bg-destructive/15 border-b border-destructive/50 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center justify-between">
            <span>Upload Error: {uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Page {state.currentPage} / {state.totalPages}</span>
          <span className="text-sm text-muted-foreground">Zoom: {(state.zoom * 100).toFixed(0)}%</span>
          {(() => {
            const ipp = getPageInchesPerPixel(state.pageScales, state.currentPage)
            return ipp ? (
              <span className="text-sm text-muted-foreground">
                Scale: 1px = {ipp.toFixed(4)}" (Page {state.currentPage})
              </span>
            ) : null
          })()}
        </div>

        <div className="flex items-center gap-2">
          {/* Active users indicator */}
          {presence.peerCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex -space-x-1.5">
                {presence.peers.slice(0, 5).map((peer) => (
                  <div
                    key={peer.userId}
                    title={`${peer.userName} (p.${peer.currentPage})`}
                    className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ backgroundColor: peer.color }}
                  >
                    {peer.userName.charAt(0).toUpperCase()}
                  </div>
                ))}
                {presence.peerCount > 5 && (
                  <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{presence.peerCount - 5}
                  </div>
                )}
              </div>
              <Users className="w-3.5 h-3.5" />
              <span>{presence.peerCount}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setScaleDialogOpen(true)}
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Scale
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('pdf-upload')?.click()}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                Upload PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tool Rail */}
        <ToolRail
          activeTool={state.activeTool}
          onToolSelect={(tool) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool })}
          onClear={() => {
            if (confirm('Clear all markups?')) {
              const ds = docStateRef.current
              for (const m of ds.markups) {
                ds.removeMarkup(m.id, m.pageNumber)
              }
            }
          }}
          onExport={() => {
            const data = JSON.stringify(state.markups, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `markups_${Date.now()}.json`
            a.click()
          }}
          onAddPDF={() => document.getElementById('pdf-upload')?.click()}
        />

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PDFCanvasViewer
              pdfUrl={pdfUrl}
              markups={state.markups}
              onMarkupsChange={handleMarkupsChange}
              activeTool={state.activeTool}
              selectedMarkupId={state.selectedMarkupId}
              onMarkupSelect={handleMarkupSelect}
              zoom={state.zoom}
              onZoomChange={(z) => dispatch({ type: 'SET_ZOOM', payload: z })}
              pageScales={state.pageScales}
              onCalibrate={handleCalibrate}
            />
          </div>

          {/* Bottom Markups List */}
          <MarkupsListTable
            markups={state.markups}
            selectedMarkupId={state.selectedMarkupId}
            onMarkupSelect={handleMarkupSelect}
            onMarkupDelete={(id) => {
              const ds = docStateRef.current
              const m = ds.markups.find((mk) => mk.id === id)
              ds.removeMarkup(id, m?.pageNumber)
            }}
            pageScales={state.pageScales}
          />
        </div>

        {/* Right Sidebar - Modular Panels */}
        <ResizableSidebar
          defaultWidth={320}
          minWidth={250}
          maxWidth={500}
          onWidthChange={(w) => dispatch({ type: 'SET_SIDEBAR_WIDTH', payload: w })}
        >
          <div className="space-y-4">
            {/* Properties Panel */}
            <SidebarPanel
              isActive={state.activePanel === 'properties'}
              onClose={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: null })}
              title="Properties"
              icon={<Settings2 className="w-4 h-4" />}
            >
              <PropertiesPanelContent
                markup={selectedMarkup}
                onUpdate={(data) => {
                  docStateRef.current.editMarkup(data)
                }}
              />
            </SidebarPanel>
          </div>
        </ResizableSidebar>
      </div>

      {/* Scale Calibration Dialog */}
      <ScaleCalibrationDialog
        open={scaleDialogOpen}
        onOpenChange={(open) => {
          setScaleDialogOpen(open)
          if (!open) setCalibrationPixelDistance(null)
        }}
        pageNumber={state.currentPage}
        currentScale={state.pageScales.find((s) => s.pageNumber === state.currentPage) ?? null}
        onScaleSet={handleScaleSet}
        calibrationPixelDistance={calibrationPixelDistance}
      />

      {/* Hidden File Input */}
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />


    </div>
  )
}

/**
 * Wrapper with context provider
 */
export default function PlanViewerPage() {
  return (
    <PDFViewerProvider>
      <PlanViewerContent />
    </PDFViewerProvider>
  )
}
